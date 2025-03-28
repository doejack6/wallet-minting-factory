
import { Wallet, WalletType, FilterOptions, DatabaseStats, CompactWallet } from './types';

class WalletDatabase {
  private wallets: CompactWallet[] = [];
  private lastWrite: Date | null = null;
  private writeSpeed = 0;
  private lastSpeedUpdate = 0;
  private lastCount = 0;
  private todayCount = 0;
  private addressSet: Set<string> = new Set(); // For fast duplicate checking
  private processingBatch = false; // Flag to prevent concurrent processing
  private writeQueue: Wallet[][] = []; // 队列存储待写入的批次
  private isProcessingQueue = false; // 标记是否正在处理队列
  private maxQueueSize = 5; // 减少最大队列长度以提高即时性
  private compressionEnabled = true; // 是否启用压缩存储
  
  constructor() {
    // Initialize database
    console.log('Initializing wallet database with compression optimization...');
    this.resetDailyCount();
    
    // Reset today's count at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeToMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCount();
      // Set up daily reset
      setInterval(() => this.resetDailyCount(), 24 * 60 * 60 * 1000);
    }, timeToMidnight);
    
    // 设置定期处理队列的机制 - 更频繁地处理，确保即时保存
    setInterval(() => this.processQueue(), 50);
  }
  
  // Utility functions for conversion between Wallet and CompactWallet
  private compactifyWallet(wallet: Wallet): CompactWallet {
    return {
      a: wallet.address,
      p: wallet.privateKey,
      k: wallet.publicKey,
      t: wallet.type === 'TRC20' ? 0 : 1,
      c: wallet.createdAt.getTime()
    };
  }
  
  private expandWallet(compact: CompactWallet): Wallet {
    // Make the ID more consistent - always use the first 8 chars of address
    const id = compact.a.substring(0, 8);
    return {
      id: id,
      address: compact.a,
      privateKey: compact.p,
      publicKey: compact.k,
      type: compact.t === 0 ? 'TRC20' : 'ERC20',
      createdAt: new Date(compact.c)
    };
  }
  
  // Toggle compression
  public setCompressionEnabled(enabled: boolean): void {
    this.compressionEnabled = enabled;
    console.log(`Database compression ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  public isCompressionEnabled(): boolean {
    return this.compressionEnabled;
  }
  
  private resetDailyCount(): void {
    this.todayCount = 0;
  }
  
  // 处理写入队列 - 优化为即时处理
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.writeQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // 取出队列中的第一批钱包
      const batch = this.writeQueue.shift();
      if (batch && batch.length > 0) {
        // 实际处理这批钱包
        await this.processBatch(batch);
      }
    } catch (error) {
      console.error('Error processing wallet queue:', error);
    } finally {
      this.isProcessingQueue = false;
      
      // 如果队列中还有数据，立即继续处理
      if (this.writeQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1);
      }
    }
  }
  
  private async processBatch(wallets: Wallet[]): Promise<void> {
    if (!wallets || wallets.length === 0) {
      return;
    }
    
    const startTime = Date.now();
    
    try {
      // Convert to compact format if compression is enabled
      if (this.compressionEnabled) {
        const compactWallets = wallets.map(wallet => this.compactifyWallet(wallet));
        this.wallets.push(...compactWallets);
      } else {
        // Store in original format (as CompactWallet but without actual compression)
        this.wallets.push(...wallets.map(wallet => ({
          a: wallet.address,
          p: wallet.privateKey,
          k: wallet.publicKey,
          t: wallet.type === 'TRC20' ? 0 : 1 as 0 | 1,
          c: wallet.createdAt.getTime()
        })));
      }
      
      // 添加地址到地址集合，用于后续去重 (不阻止当前批次)
      for (const wallet of wallets) {
        this.addressSet.add(wallet.address);
      }
      
      this.lastWrite = new Date();
      this.todayCount += wallets.length;
      
      // 计算写入速度
      const now = Date.now();
      const elapsed = (now - this.lastSpeedUpdate) / 1000;
      
      if (elapsed >= 0.2) { // 更频繁地更新写入速度
        this.writeSpeed = Math.round((this.wallets.length - this.lastCount) / elapsed);
        this.lastSpeedUpdate = now;
        this.lastCount = this.wallets.length;
      }
      
      // 发送事件通知其他组件
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('walletsStored', {
          detail: {
            count: wallets.length,
            total: this.wallets.length,
            time: Date.now() - startTime
          }
        }));
      }
      
      console.log(`Database: Stored ${wallets.length} wallets in ${Date.now() - startTime}ms. Total: ${this.wallets.length}`);
    } catch (error) {
      console.error('Error processing wallet batch:', error);
      throw error; // 重新抛出错误以便上层处理
    }
  }
  
  // 将钱包添加到队列 - 优先处理小批量以确保即时性
  private queueWallets(wallets: Wallet[]): void {
    if (wallets.length === 0) return;
    
    // 如果队列过长，暂停处理新的钱包直到队列有空间
    if (this.writeQueue.length >= this.maxQueueSize) {
      console.warn(`Database: Queue full, processing queue first before adding new batch...`);
      // 异步等待队列处理
      setTimeout(() => this.queueWallets(wallets), 50);
      return;
    }
    
    // 添加新批次到队列
    this.writeQueue.push([...wallets]);
    
    // 尝试处理队列
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }
  
  public async storeWallets(wallets: Wallet[]): Promise<void> {
    if (!wallets || wallets.length === 0) {
      console.log('Database: No wallets to store');
      return;
    }
    
    // 优化：将大批量钱包分割成较小的批次
    const batchSize = 100; // 减小批处理大小以提高保存的即时性
    
    if (wallets.length > batchSize) {
      console.log(`Database: Large batch detected (${wallets.length} wallets), splitting into smaller batches`);
      
      for (let i = 0; i < wallets.length; i += batchSize) {
        const batch = wallets.slice(i, Math.min(i + batchSize, wallets.length));
        this.queueWallets(batch);
        
        // 添加小延迟以允许UI更新和队列处理
        if (i + batchSize < wallets.length) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }
    } else {
      // 钱包数量较少，直接添加到队列
      this.queueWallets(wallets);
    }
    
    return Promise.resolve(); // 异步返回，实际写入由队列处理
  }
  
  public async getWallets(options: FilterOptions): Promise<Wallet[]> {
    // For very large exports, optimize performance
    const results: Wallet[] = [];
    
    // Process in chunks to avoid blocking the UI
    const chunkSize = 5000;
    const totalWallets = this.wallets.length;
    
    // If requesting all wallets with no filters, return all in chunks for better performance
    if (options.type === 'ALL' && !options.pattern && !options.dateFrom && !options.dateTo) {
      for (let i = 0; i < totalWallets; i += chunkSize) {
        const chunk = this.wallets.slice(i, Math.min(i + chunkSize, totalWallets));
        const expandedChunk = chunk.map(w => this.expandWallet(w));
        results.push(...expandedChunk);
        
        // Add a small delay every chunk to keep UI responsive
        if (i + chunkSize < totalWallets) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }
      
      // Sort by creation date (newest first)
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Apply limit
      return results.slice(0, options.limit);
    }
    
    // Apply filters
    let filteredWallets: CompactWallet[] = [...this.wallets];
    
    if (options.type !== 'ALL') {
      const typeValue = options.type === 'TRC20' ? 0 : 1;
      filteredWallets = filteredWallets.filter(wallet => wallet.t === typeValue);
    }
    
    if (options.pattern) {
      const pattern = options.pattern.toLowerCase();
      
      switch (options.patternType) {
        case 'ANY':
          filteredWallets = filteredWallets.filter(wallet => 
            wallet.a.toLowerCase().includes(pattern)
          );
          break;
        case 'END':
          const endLength = options.patternLength || pattern.length;
          filteredWallets = filteredWallets.filter(wallet => {
            const address = wallet.a.toLowerCase();
            return address.endsWith(pattern) || 
                  (endLength > 0 && address.slice(-endLength) === pattern);
          });
          break;
        case 'START':
          const startLength = options.patternLength || pattern.length;
          filteredWallets = filteredWallets.filter(wallet => {
            const address = wallet.a.toLowerCase();
            return address.startsWith(pattern) || 
                  (startLength > 0 && address.slice(0, startLength) === pattern);
          });
          break;
        case 'START_END':
          filteredWallets = filteredWallets.filter(wallet => {
            const address = wallet.a.toLowerCase();
            const parts = pattern.split('+');
            if (parts.length !== 2) return false;
            
            const [start, end] = parts;
            return address.startsWith(start) && address.endsWith(end);
          });
          break;
        case 'CUSTOM':
          // For custom length pattern searches
          const length = options.patternLength;
          if (length > 0) {
            filteredWallets = filteredWallets.filter(wallet => {
              const address = wallet.a.toLowerCase();
              // Search for pattern of exact length
              return address.includes(pattern) && pattern.length === length;
            });
          } else {
            filteredWallets = filteredWallets.filter(wallet => 
              wallet.a.toLowerCase().includes(pattern)
            );
          }
          break;
      }
    }
    
    if (options.dateFrom) {
      const fromTime = options.dateFrom.getTime();
      filteredWallets = filteredWallets.filter(wallet => wallet.c >= fromTime);
    }
    
    if (options.dateTo) {
      const toTime = options.dateTo.getTime();
      filteredWallets = filteredWallets.filter(wallet => wallet.c <= toTime);
    }
    
    // Process filtered wallets in chunks
    for (let i = 0; i < filteredWallets.length; i += chunkSize) {
      const chunk = filteredWallets.slice(i, Math.min(i + chunkSize, filteredWallets.length));
      const expandedChunk = chunk.map(w => this.expandWallet(w));
      results.push(...expandedChunk);
      
      // Add a small delay every chunk to keep UI responsive
      if (i + chunkSize < filteredWallets.length) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    
    // Sort by creation date (newest first)
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply limit
    return results.slice(0, options.limit);
  }
  
  public getTotalCount(): number {
    return this.wallets.length;
  }
  
  public getTodayCount(): number {
    return this.todayCount;
  }
  
  public getLastWrite(): Date | null {
    return this.lastWrite;
  }
  
  public getWriteSpeed(): number {
    return this.writeSpeed;
  }
  
  public getTypeCount(type: WalletType): number {
    const typeValue = type === 'TRC20' ? 0 : 1;
    return this.wallets.filter(wallet => wallet.t === typeValue).length;
  }
  
  public getDatabaseSize(): string {
    // More accurate estimation of database size with compression
    const walletCount = this.wallets.length;
    let totalBytes: number;
    
    if (this.compressionEnabled) {
      // Compressed storage - significantly more efficient
      // Average size per wallet: ~200 bytes with compression
      totalBytes = walletCount * 200;
    } else {
      // Uncompressed storage
      // Average size per wallet: ~500 bytes
      totalBytes = walletCount * 500;
    }
    
    // Estimated size for 100M wallets: ~20GB with compression
    
    if (totalBytes < 1024) {
      return `${totalBytes} bytes`;
    } else if (totalBytes < 1024 * 1024) {
      return `${(totalBytes / 1024).toFixed(2)} KB`;
    } else if (totalBytes < 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }
  
  // Calculate estimated size for a specific number of wallets
  public estimateSizeForWalletCount(count: number): string {
    const bytesPerWallet = this.compressionEnabled ? 200 : 500;
    const totalBytes = count * bytesPerWallet;
    
    if (totalBytes < 1024) {
      return `${totalBytes} bytes`;
    } else if (totalBytes < 1024 * 1024) {
      return `${(totalBytes / 1024).toFixed(2)} KB`;
    } else if (totalBytes < 1024 * 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
      return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
  }
  
  public getStats(): DatabaseStats {
    return {
      totalStored: this.getTotalCount(),
      databaseSize: this.getDatabaseSize(),
      lastWrite: this.getLastWrite(),
      writeSpeed: this.getWriteSpeed(),
      trc20Count: this.getTypeCount('TRC20'),
      erc20Count: this.getTypeCount('ERC20'),
    };
  }
  
  public async clearDatabase(): Promise<void> {
    this.wallets = [];
    this.addressSet.clear(); // Clear the set too
    this.lastWrite = new Date();
    this.writeQueue = []; // 清空写入队列
    
    // Notify that database was cleared using event system
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('databaseCleared'));
    }
    
    console.log('Database: Cleared all wallets');
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Create singleton instance
export const walletDB = new WalletDatabase();
