import { Wallet, WalletType, FilterOptions, DatabaseStats } from './types';

class WalletDatabase {
  private wallets: Wallet[] = [];
  private lastWrite: Date | null = null;
  private writeSpeed = 0;
  private lastSpeedUpdate = 0;
  private lastCount = 0;
  private todayCount = 0;
  private addressSet: Set<string> = new Set(); // For fast duplicate checking
  
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
  }
  
  private resetDailyCount(): void {
    this.todayCount = 0;
  }
  
  public async storeWallets(wallets: Wallet[]): Promise<void> {
    if (!wallets || wallets.length === 0) {
      console.log('Database: No wallets to store');
      return;
    }
    
    const startTime = Date.now();
    
    // Process wallets in smaller chunks to avoid blocking the main thread
    const chunkSize = 1000;
    const totalWallets = wallets.length;
    let uniqueWalletsCount = 0;
    
    for (let i = 0; i < totalWallets; i += chunkSize) {
      const chunk = wallets.slice(i, i + chunkSize);
      
      // Filter out duplicates by checking against the address set
      const uniqueWalletsInChunk = chunk.filter(wallet => {
        if (this.addressSet.has(wallet.address)) {
          return false;
        }
        this.addressSet.add(wallet.address);
        return true;
      });
      
      uniqueWalletsCount += uniqueWalletsInChunk.length;
      
      // Add unique wallets to the collection
      if (uniqueWalletsInChunk.length > 0) {
        this.wallets = [...this.wallets, ...uniqueWalletsInChunk];
      }
    }
    
    if (uniqueWalletsCount === 0) {
      console.log('Database: All wallets were duplicates, nothing to store');
      return;
    }
    
    this.lastWrite = new Date();
    this.todayCount += uniqueWalletsCount;
    
    // Calculate write speed
    const now = Date.now();
    const elapsed = (now - this.lastSpeedUpdate) / 1000;
    
    if (elapsed >= 0.5) { // Reduced from 1 to 0.5 seconds for more frequent updates
      this.writeSpeed = Math.round((this.wallets.length - this.lastCount) / elapsed);
      this.lastSpeedUpdate = now;
      this.lastCount = this.wallets.length;
    }
    
    // Dispatch event for other components to listen to
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('walletsStored', {
        detail: {
          count: uniqueWalletsCount,
          total: this.wallets.length,
          time: Date.now() - startTime
        }
      }));
    }
    
    console.log(`Database: Stored ${uniqueWalletsCount} unique wallets in ${Date.now() - startTime}ms. Total: ${this.wallets.length}`);
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
