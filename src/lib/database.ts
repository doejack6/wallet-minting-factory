
import { Wallet, WalletType, FilterOptions } from './types';

// Mock implementation of a high-performance database
// In a real application, this would use IndexedDB, SQLite, or other storage solution

class WalletDatabase {
  private wallets: Wallet[] = [];
  private lastWrite: Date | null = null;
  private writeSpeed = 0;
  private lastSpeedUpdate = 0;
  private lastCount = 0;
  
  constructor() {
    // Initialize database
    console.log('Initializing wallet database...');
  }
  
  public async storeWallets(wallets: Wallet[]): Promise<void> {
    const startTime = Date.now();
    
    // In a real implementation, this would batch insert to a database
    this.wallets = [...this.wallets, ...wallets];
    this.lastWrite = new Date();
    
    // Calculate write speed
    const now = Date.now();
    const elapsed = (now - this.lastSpeedUpdate) / 1000;
    
    if (elapsed >= 1) {
      this.writeSpeed = Math.round((this.wallets.length - this.lastCount) / elapsed);
      this.lastCount = this.wallets.length;
      this.lastSpeedUpdate = now;
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
      results = results.filter(wallet => 
        wallet.address.toLowerCase().includes(pattern)
      );
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
  
  public async clearDatabase(): Promise<void> {
    this.wallets = [];
    this.lastWrite = new Date();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Create singleton instance
export const walletDB = new WalletDatabase();
