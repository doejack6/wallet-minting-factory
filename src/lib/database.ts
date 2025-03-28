import { Wallet, WalletType, FilterOptions, DatabaseStats } from './types';

class WalletDatabase {
  private wallets: Wallet[] = [];
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
  
  constructor() {
    // Initialize database
    console.log('Initializing wallet database...');
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
      // 优化: 直接将钱包添加到主列表，确保计数一致性
      this.wallets.push(...wallets);
      
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
    // Simulate query latency
    await new Promise(resolve => setTimeout(resolve, 100));
    
    let results = [...this.wallets];
    
    // Apply filters
    if (options.type !== 'ALL') {
      results = results.filter(wallet => wallet.type === options.type);
    }
    
    if (options.pattern) {
      const pattern = options.pattern.toLowerCase();
      
      switch (options.patternType) {
        case 'ANY':
          results = results.filter(wallet => 
            wallet.address.toLowerCase().includes(pattern)
          );
          break;
        case 'END':
          const endLength = options.patternLength || pattern.length;
          results = results.filter(wallet => {
            const address = wallet.address.toLowerCase();
            return address.endsWith(pattern) || 
                  (endLength > 0 && address.slice(-endLength) === pattern);
          });
          break;
        case 'START':
          const startLength = options.patternLength || pattern.length;
          results = results.filter(wallet => {
            const address = wallet.address.toLowerCase();
            return address.startsWith(pattern) || 
                  (startLength > 0 && address.slice(0, startLength) === pattern);
          });
          break;
        case 'START_END':
          results = results.filter(wallet => {
            const address = wallet.address.toLowerCase();
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
            results = results.filter(wallet => {
              const address = wallet.address.toLowerCase();
              // Search for pattern of exact length
              return address.includes(pattern) && pattern.length === length;
            });
          } else {
            results = results.filter(wallet => 
              wallet.address.toLowerCase().includes(pattern)
            );
          }
          break;
      }
    }
    
    if (options.dateFrom) {
      results = results.filter(wallet => 
        wallet.createdAt >= options.dateFrom!
      );
    }
    
    if (options.dateTo) {
      results = results.filter(wallet => 
        wallet.createdAt <= options.dateTo!
      );
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
    return this.wallets.filter(wallet => wallet.type === type).length;
  }
  
  public getDatabaseSize(): string {
    // Rough estimation of database size
    // In a real implementation, this would query the actual storage usage
    const avgWalletSize = 500; // bytes
    const totalBytes = this.wallets.length * avgWalletSize;
    
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
