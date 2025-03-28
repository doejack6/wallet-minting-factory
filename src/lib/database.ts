
import { Wallet, WalletType, FilterOptions, DatabaseStats, SearchPatternType } from './types';
import { walletGenerator } from './walletGenerator';

// Mock implementation of a high-performance database
// In a real application, this would use IndexedDB, SQLite, or other storage solution

class WalletDatabase {
  private wallets: Wallet[] = [];
  private lastWrite: Date | null = null;
  private writeSpeed = 0;
  private lastSpeedUpdate = 0;
  private lastCount = 0;
  private todayCount = 0;
  
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
    const startTime = Date.now();
    
    // In a real implementation, this would batch insert to a database
    this.wallets = [...this.wallets, ...wallets];
    this.lastWrite = new Date();
    this.todayCount += wallets.length;
    
    // Calculate write speed
    const now = Date.now();
    const elapsed = (now - this.lastSpeedUpdate) / 1000;
    
    if (elapsed >= 1) {
      this.writeSpeed = Math.round((this.wallets.length - this.lastCount) / elapsed);
      this.lastCount = this.wallets.length;
      this.lastSpeedUpdate = now;
    }
    
    // Update wallet generator with current database count
    if (walletGenerator) {
      walletGenerator.setSavedCount(this.wallets.length);
    }
    
    // Simulate database latency
    await new Promise(resolve => setTimeout(resolve, 10));
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
    this.lastWrite = new Date();
    
    // Reset wallet generator saved count when database is cleared
    if (walletGenerator) {
      walletGenerator.setSavedCount(0);
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Create singleton instance
export const walletDB = new WalletDatabase();
