import { WalletType, Wallet, GeneratorConfig } from './types';
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
  private savedToDbCount = 0;
  private startTime: Date | null = null;
  private lastSpeedUpdate = 0;
  private lastSample = 0;
  private todayGenerated = 0;
  private onProgress: ((stats: { count: number, speed: number, savedCount: number }) => void) | null = null;
  
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
    
    // Ensure initial database sync when starting
    this.syncWithDatabase();
    
    this.runGenerationCycle();
  }
  
  public stop(): void {
    this.running = false;
  }
  
  public isRunning(): boolean {
    return this.running;
  }
  
  public getTotalGenerated(): number {
    return this.generatedCount;
  }
  
  public getTodayGenerated(): number {
    return this.todayGenerated;
  }
  
  public getTypeCount(type: WalletType): number {
    return this.wallets.filter(wallet => wallet.type === type).length;
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
  
  private async syncWithDatabase() {
    // Periodically sync generated wallets with the database
    const batchToSave = this.getLastBatch(1000);
    try {
      await walletDB.storeWallets(batchToSave);
      this.setSavedCount(walletDB.getTotalCount());
    } catch (error) {
      console.error('Failed to sync wallets with database', error);
    }
  }
  
  private runGenerationCycle(): void {
    if (!this.running) return;
    
    // For demo purposes, we generate a smaller batch
    // In real implementation this would be done in a more efficient way
    const batchSize = Math.min(this.config.batchSize, this.targetSpeed / 20);
    
    // Calculate how many of each type to generate based on ratio
    const trc20Count = Math.round(batchSize * (this.config.trc20Ratio / 100));
    const erc20Count = batchSize - trc20Count;
    
    // Generate wallets according to configured ratio
    const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
    const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
    
    // Store for recent access (limited to 1000 most recent for demo)
    this.wallets = [...this.wallets, ...trc20Batch, ...erc20Batch].slice(-1000);
    
    this.generatedCount += batchSize;
    this.todayGenerated += batchSize;
    
    // Calculate generation speed
    const now = Date.now();
    const elapsed = (now - this.lastSpeedUpdate) / 1000;
    
    if (elapsed >= 1) {
      this.generationSpeed = Math.round((this.generatedCount - this.lastSample) / elapsed);
      this.lastSample = this.generatedCount;
      this.lastSpeedUpdate = now;
      
      // Notify progress
      if (this.onProgress) {
        this.onProgress({
          count: this.generatedCount,
          speed: this.generationSpeed,
          savedCount: this.savedToDbCount
        });
      }
    }
    
    // Add periodic database sync
    if (this.generatedCount % 10000 === 0) {
      this.syncWithDatabase();
    }
    
    // Schedule next cycle based on thread count (simulated)
    // In real implementation, we would adjust this based on performance metrics
    const cycleTime = 50 / this.config.threadCount; // Adjust cycle time based on thread count
    setTimeout(() => this.runGenerationCycle(), cycleTime);
  }
}

// Create singleton instance
export const walletGenerator = new WalletGeneratorEngine();
