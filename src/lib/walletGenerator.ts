
import { Wallet, WalletType, GeneratorConfig } from './types';
import { walletDB } from './database';

// Improved hex string generator for cryptographic-like randomness
function generateRandomHex(length: number): string {
  let result = '';
  const characters = '0123456789abcdef';
  const charactersLength = characters.length;
  
  // Use crypto API for better randomness when available
  if (typeof window !== 'undefined' && window.crypto) {
    const values = new Uint8Array(Math.ceil(length / 2));
    window.crypto.getRandomValues(values);
    result = Array.from(values)
      .map(value => characters[value % charactersLength])
      .join('')
      .slice(0, length);
  } else {
    // Fallback to Math.random() if crypto API is not available
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  }
  
  return result;
}

// Generate a TRC20 wallet address (Tron)
// Format: T + base58 encoded string (34 chars total)
function generateTRC20Address(): string {
  // TRC20 addresses start with 'T' and are 34 characters long
  // First character is always 'T', followed by 33 base58 characters
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let address = 'T';
  
  for (let i = 0; i < 33; i++) {
    const randomIndex = Math.floor(Math.random() * base58Chars.length);
    address += base58Chars.charAt(randomIndex);
  }
  
  return address;
}

// Generate an ERC20 wallet address (Ethereum)
// Format: 0x + 40 hex characters (42 chars total)
function generateERC20Address(): string {
  // ERC20 addresses are '0x' followed by 40 hex characters (20 bytes)
  return '0x' + generateRandomHex(40);
}

// Generate a private key - 64 hex chars (32 bytes)
function generatePrivateKey(): string {
  return generateRandomHex(64);
}

// Generate a public key
function generatePublicKey(): string {
  // In reality, public keys are derived from private keys
  // But for this simulation, we'll generate a random string
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
  private addressSet: Set<string> = new Set(); // For tracking unique addresses
  private pendingWallets: Wallet[] = []; // Buffer for wallets pending to be saved
  private maxBufferSize = 10000; // Maximum buffer size before syncing with database
  private lastSyncTime = 0; // Last time synced with database
  private minSyncInterval = 50; // Minimum time (ms) between database syncs
  
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
        console.log(`WalletGenerator: Updated saved count to ${this.savedToDbCount}`);
      });
      
      window.addEventListener('databaseCleared', () => {
        this.savedToDbCount = 0;
        this.addressSet.clear();
        this.pendingWallets = [];
        console.log('WalletGenerator: Database cleared event received');
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
    // Update buffer size based on batch size
    this.maxBufferSize = Math.max(10000, this.config.batchSize * 10);
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
    this.lastSyncTime = Date.now();
    
    // Ensure we have correct database count before starting
    this.synchronizeWithDatabase();
    
    // Set up recurring database sync at shorter intervals for more accuracy
    if (this.syncInterval === null) {
      this.syncInterval = window.setInterval(() => {
        this.synchronizeWithDatabase();
      }, 100); // Check every 100ms (reduced from 200ms)
    }
    
    // Set up automatic sync to database at a shorter interval
    if (this.dbSyncInterval === null) {
      this.dbSyncInterval = window.setInterval(() => {
        this.syncWithDatabase(true); // Force sync
      }, 50); // Sync every 50ms (reduced from 100ms)
    }
    
    this.runGenerationCycle();
  }
  
  public stop(): void {
    this.running = false;
    
    // Final sync before stopping
    this.syncWithDatabase(true);
    
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
    // Adjust max buffer size based on target speed
    this.maxBufferSize = Math.max(10000, Math.floor(speed / 10));
  }
  
  public getLastBatch(limit: number = 100): Wallet[] {
    // Return from both pending wallets and recently saved wallets
    if (this.pendingWallets.length > 0) {
      const combined = [...this.wallets, ...this.pendingWallets];
      return combined.slice(-limit);
    }
    return this.wallets.slice(-limit);
  }
  
  public resetGeneratedCount(): void {
    this.generatedCount = 0;
    this.realGeneratedCount = 0;
    this.todayGenerated = 0;
    this.addressSet.clear();
    this.pendingWallets = [];
  }
  
  private async syncWithDatabase(force: boolean = false) {
    if (!this.running && !force) return;
    
    const now = Date.now();
    // Only sync if enough time has passed or buffer is large enough or force sync
    if (!force && now - this.lastSyncTime < this.minSyncInterval && this.pendingWallets.length < this.maxBufferSize) {
      return;
    }
    
    if (this.pendingWallets.length === 0) {
      return;
    }
    
    this.lastSyncTime = now;
    
    // Take wallets from pending buffer
    const batchToSave = [...this.pendingWallets];
    this.pendingWallets = []; // Clear pending buffer
    
    try {
      console.log(`Generator: Attempting to save ${batchToSave.length} wallets to database`);
      
      // Save the wallets to the database directly
      await walletDB.storeWallets(batchToSave);
      
      // Keep a sliding window of recent wallets for display
      this.wallets = [...this.wallets, ...batchToSave].slice(-1000);
      
      // Update saved count from database
      this.savedToDbCount = walletDB.getTotalCount();
      
      // Update progress if callback is set
      if (this.onProgress) {
        this.onProgress({
          count: this.realGeneratedCount,
          speed: this.generationSpeed,
          savedCount: this.savedToDbCount
        });
      }
    } catch (error) {
      console.error('Failed to sync wallets with database', error);
      // Put wallets back into pending buffer for retry
      this.pendingWallets = [...batchToSave, ...this.pendingWallets];
    }
  }
  
  private runGenerationCycle(): void {
    if (!this.running) return;
    
    // Calculate batch size based on target speed, adjusting for actual throughput
    const storageEfficiency = this.savedToDbCount > 0 && this.realGeneratedCount > 0 
      ? this.savedToDbCount / this.realGeneratedCount 
      : 1;
    
    // If storage efficiency is low, reduce batch size to allow database to catch up
    let adjustedBatchSize = Math.min(
      this.config.batchSize, 
      Math.floor(this.targetSpeed / 20)
    );
    
    // If storage efficiency is below 50%, reduce batch size proportionally
    if (storageEfficiency < 0.5) {
      adjustedBatchSize = Math.max(100, Math.floor(adjustedBatchSize * storageEfficiency * 2));
    }
    
    const trc20Count = Math.round(adjustedBatchSize * (this.config.trc20Ratio / 100));
    const erc20Count = adjustedBatchSize - trc20Count;
    
    const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
    const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
    
    const newBatch = [...trc20Batch, ...erc20Batch];
    
    // Add to pending wallets buffer
    this.pendingWallets.push(...newBatch);
    
    // If buffer exceeds max size, trigger a database sync
    if (this.pendingWallets.length >= this.maxBufferSize) {
      this.syncWithDatabase();
    }
    
    // Increment counters for generated wallets
    this.generatedCount += newBatch.length;
    this.realGeneratedCount += newBatch.length;
    this.todayGenerated += newBatch.length;
    
    // Update generation speed calculation
    const now = Date.now();
    const elapsed = (now - this.lastSpeedUpdate) / 1000;
    
    if (elapsed >= 0.5) {
      this.generationSpeed = Math.round((this.generatedCount - this.lastSample) / elapsed);
      this.lastSample = this.generatedCount;
      this.lastSpeedUpdate = now;
      
      // Update progress if callback is set
      if (this.onProgress) {
        this.onProgress({
          count: this.realGeneratedCount,
          speed: this.generationSpeed,
          savedCount: this.savedToDbCount
        });
      }
    }
    
    // Adaptive cycle timing based on storage efficiency
    // Slow down if storage efficiency is poor
    let cycleTime = 25 / this.config.threadCount;
    if (storageEfficiency < 0.3) {
      cycleTime = cycleTime * 3; // Slow down significantly if storage efficiency is very bad
    } else if (storageEfficiency < 0.7) {
      cycleTime = cycleTime * 1.5; // Slow down moderately if storage efficiency is mediocre
    }
    
    setTimeout(() => this.runGenerationCycle(), cycleTime);
  }
}

export const walletGenerator = new WalletGeneratorEngine();
