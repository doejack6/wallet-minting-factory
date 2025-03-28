import { Wallet, WalletType } from './types';
import { walletDB } from './database';

// Mock implementation of a high-performance wallet generator
// In a real application, this would use proper cryptographic libraries

// Simulated random hex string generator for demo purposes
function generateRandomHex(length: number): string {
  let result = '';
  const characters = '0123456789abcdef';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Generate a TRC20 wallet address (Tron)
function generateTRC20Address(): string {
  return 'T' + generateRandomHex(33);
}

// Generate an ERC20 wallet address (Ethereum)
function generateERC20Address(): string {
  return '0x' + generateRandomHex(40);
}

// Generate a private key
function generatePrivateKey(): string {
  return generateRandomHex(64);
}

// Generate a public key
function generatePublicKey(): string {
  return generateRandomHex(128);
}

// Generate a single wallet
export function generateWallet(type: WalletType): Wallet {
  const privateKey = generatePrivateKey();
  const publicKey = generatePublicKey();
  const address = type === 'TRC20' ? generateTRC20Address() : generateERC20Address();
  
  return {
    id: crypto.randomUUID(),
    address,
    privateKey,
    publicKey,
    type,
    createdAt: new Date(),
  };
}

// Generate multiple wallets in batch
export function generateWalletBatch(count: number, type: WalletType): Wallet[] {
  const wallets: Wallet[] = [];
  for (let i = 0; i < count; i++) {
    wallets.push(generateWallet(type));
  }
  return wallets;
}

// In a real application, this would be a proper multi-threaded or WebWorker implementation
export class WalletGeneratorEngine {
  private running = false;
  private wallets: Wallet[] = [];
  private generationSpeed = 0;
  private targetSpeed = 100000; // Target 100k per second
  private generatedCount = 0;
  private realGeneratedCount = 0; // Actual count for UI display
  private savedToDbCount = 0;
  private startTime: Date | null = null;
  private lastSpeedUpdate = 0;
  private lastSample = 0;
  private todayGenerated = 0;
  private onProgress: ((stats: { count: number, speed: number, savedCount: number }) => void) | null = null;
  private syncInterval: number | null = null;
  private dbSyncInterval: number | null = null;
  
  // Advanced configuration options
  private config: GeneratorConfig = {
    trc20Ratio: 50, // 50% TRC20
    threadCount: 4,
    batchSize: 1000,
    memoryLimit: 512, // MB
  };
  
  constructor() {
    // Initialize engine
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
    
    // Listen for database events
    if (typeof window !== 'undefined') {
      window.addEventListener('walletsStored', (e: any) => {
        this.savedToDbCount = e.detail.total;
      });
      
      window.addEventListener('databaseCleared', () => {
        this.savedToDbCount = 0;
      });
    }
    
    // Synchronize with database on initialization
    this.synchronizeWithDatabase();
  }
  
  private async synchronizeWithDatabase() {
    try {
      this.savedToDbCount = walletDB.getTotalCount();
      console.log(`Generator: Synchronized with database. Total saved: ${this.savedToDbCount}`);
    } catch (error) {
      console.error('Failed to synchronize with database', error);
    }
  }
  
  private resetDailyCount(): void {
    this.todayGenerated = 0;
  }
  
  public setOnProgress(callback: (stats: { count: number, speed: number, savedCount: number }) => void): void {
    this.onProgress = callback;
  }
  
  public setSavedCount(count: number): void {
    this.savedToDbCount = count;
  }
  
  public getSavedCount(): number {
    return this.savedToDbCount;
  }
  
  public incrementSavedCount(count: number): void {
    this.savedToDbCount += count;
  }
  
  public setConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  public getConfig(): GeneratorConfig {
    return { ...this.config };
  }
  
  public start(): void {
    if (this.running) return;
    
    this.running = true;
    this.startTime = new Date();
    this.lastSpeedUpdate = Date.now();
    this.lastSample = this.generatedCount;
    
    // Ensure we have correct database count before starting
    this.synchronizeWithDatabase();
    
    // Set up recurring database sync at longer intervals
    if (this.syncInterval === null) {
      this.syncInterval = window.setInterval(() => {
        this.synchronizeWithDatabase();
      }, 10000); // Check every 10 seconds
    }
    
    // Set up automatic sync to database at a reasonable interval to avoid too frequent syncing
    if (this.dbSyncInterval === null) {
      this.dbSyncInterval = window.setInterval(() => {
        this.syncWithDatabase();
      }, 3000); // Sync every 3 seconds
    }
    
    this.runGenerationCycle();
  }
  
  public stop(): void {
    this.running = false;
    
    // Final sync before stopping
    this.syncWithDatabase();
    
    // Clear sync intervals
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    if (this.dbSyncInterval !== null) {
      clearInterval(this.dbSyncInterval);
      this.dbSyncInterval = null;
    }
  }
  
  public isRunning(): boolean {
    return this.running;
  }
  
  public getTotalGenerated(): number {
    return this.realGeneratedCount;
  }
  
  public getTodayGenerated(): number {
    return this.todayGenerated;
  }
  
  public getTypeCount(type: WalletType): number {
    // Estimate based on ratio
    if (type === 'TRC20') {
      return Math.floor(this.realGeneratedCount * (this.config.trc20Ratio / 100));
    } else {
      return Math.floor(this.realGeneratedCount * ((100 - this.config.trc20Ratio) / 100));
    }
  }
  
  public getUptime(): number {
    if (!this.startTime) return 0;
    return (new Date().getTime() - this.startTime.getTime()) / 1000;
  }
  
  public getCurrentSpeed(): number {
    return this.generationSpeed;
  }
  
  public setTargetSpeed(speed: number): void {
    this.targetSpeed = speed;
  }
  
  public getLastBatch(limit: number = 100): Wallet[] {
    return this.wallets.slice(-limit);
  }
  
  public resetGeneratedCount(): void {
    this.generatedCount = 0;
    this.realGeneratedCount = 0;
    this.todayGenerated = 0;
  }
  
  private async syncWithDatabase() {
    if (!this.running) return;
    
    const batchToSave = this.getLastBatch(1000);
    if (batchToSave.length > 0) {
      try {
        const uniqueWallets = batchToSave.filter(
          (wallet, index, self) => 
            self.findIndex(w => w.address === wallet.address) === index
        );
        
        await walletDB.storeWallets(uniqueWallets);
        
        this.savedToDbCount = walletDB.getTotalCount();
        
        if (this.realGeneratedCount < this.savedToDbCount) {
          this.realGeneratedCount = this.savedToDbCount;
        }
        
        if (this.onProgress) {
          this.onProgress({
            count: this.realGeneratedCount,
            speed: this.generationSpeed,
            savedCount: this.savedToDbCount
          });
        }
        
        console.log(`Generator: Synced ${uniqueWallets.length} unique wallets. Total in DB: ${this.savedToDbCount}`);
      } catch (error) {
        console.error('Failed to sync wallets with database', error);
      }
    }
  }
  
  private runGenerationCycle(): void {
    if (!this.running) return;
    
    const batchSize = Math.min(this.config.batchSize, Math.floor(this.targetSpeed / 20));
    
    const trc20Count = Math.round(batchSize * (this.config.trc20Ratio / 100));
    const erc20Count = batchSize - trc20Count;
    
    const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
    const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
    
    const newBatch = [...trc20Batch, ...erc20Batch];
    
    this.wallets = [...this.wallets, ...newBatch].slice(-1000);
    
    this.generatedCount += newBatch.length;
    this.realGeneratedCount += newBatch.length;
    this.todayGenerated += newBatch.length;
    
    const now = Date.now();
    const elapsed = (now - this.lastSpeedUpdate) / 1000;
    
    if (elapsed >= 1) {
      this.generationSpeed = Math.round((this.generatedCount - this.lastSample) / elapsed);
      this.lastSample = this.generatedCount;
      this.lastSpeedUpdate = now;
      
      if (this.onProgress) {
        this.onProgress({
          count: this.realGeneratedCount,
          speed: this.generationSpeed,
          savedCount: this.savedToDbCount
        });
      }
    }
    
    const cycleTime = 50 / this.config.threadCount;
    setTimeout(() => this.runGenerationCycle(), cycleTime);
  }
}

export const walletGenerator = new WalletGeneratorEngine();
