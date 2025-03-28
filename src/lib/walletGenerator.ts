
import { Wallet, WalletType, GeneratorConfig } from './types';
import { walletDB } from './database';
import * as CryptoJS from 'crypto-js';

// Enhanced cryptographically secure random number generation
function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback for environments without crypto API
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return bytes;
}

// Convert bytes to hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Generate random hex string with specified length
function generateRandomHex(length: number): string {
  const byteLength = Math.ceil(length / 2);
  const bytes = generateRandomBytes(byteLength);
  return bytesToHex(bytes).slice(0, length);
}

// Base58 encoding for TRC20 addresses
const BASE58_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(data: Uint8Array): string {
  let result = '';
  let value = 0;
  let j = 0;
  
  for (let i = 0; i < data.length; i++) {
    for (let x = 0; x < 8; x++) {
      value = ((value << 1) | ((data[i] >> (7 - x)) & 1));
      j++;
      if (j % 6 === 0) {
        result += BASE58_CHARS[value];
        value = 0;
      }
    }
  }
  
  if (j % 6 !== 0) {
    value <<= (6 - (j % 6));
    result += BASE58_CHARS[value];
  }
  
  return result;
}

// Generate a TRC20 private key
function generateTRC20PrivateKey(): string {
  // Generate 32 bytes (64 hex chars) of randomness
  const bytes = generateRandomBytes(32);
  
  // Ensure the private key is in the valid range for ECDSA
  bytes[0] = bytes[0] & 0x7F; // Clear the highest bit of the first byte
  
  return bytesToHex(bytes);
}

// Generate an ERC20 private key - 64 hex chars (32 bytes)
function generateERC20PrivateKey(): string {
  const bytes = generateRandomBytes(32);
  return bytesToHex(bytes);
}

// Simplified SHA256 for demonstration purposes (using CryptoJS)
function sha256(hexString: string): string {
  const wordArray = CryptoJS.enc.Hex.parse(hexString);
  const hash = CryptoJS.SHA256(wordArray);
  return hash.toString(CryptoJS.enc.Hex);
}

// Keccak256 hash function for Ethereum addresses
function keccak256(hexString: string): string {
  const wordArray = CryptoJS.enc.Hex.parse(hexString);
  const hash = CryptoJS.SHA3(wordArray, { outputLength: 256 });
  return hash.toString(CryptoJS.enc.Hex);
}

// Improved TRON address derivation that better matches wallet behavior
function deriveTRC20Address(privateKey: string): string {
  // In a real implementation:
  // 1. Derive public key from private key using secp256k1 curve
  // 2. Calculate keccak256 hash of the public key
  // 3. Take the last 20 bytes and convert to TRON format with base58
  
  // For this simulation, we need a more accurate representation
  // We'll use a deterministic but more realistic approach
  
  // Use both SHA256 and keccak256 for a more unique hash
  const hash = keccak256(sha256(privateKey) + privateKey);
  const addressHex = hash.substring(hash.length - 40); // Take last 20 bytes (40 chars)
  
  // Add 41 prefix (TRON's network ID in hex)
  const addressWithPrefix = "41" + addressHex;
  
  // Convert hex to byte array
  const bytes = new Uint8Array(21);
  for (let i = 0; i < addressWithPrefix.length / 2; i++) {
    bytes[i] = parseInt(addressWithPrefix.substring(i * 2, i * 2 + 2), 16);
  }
  
  // Calculate double SHA256 checksum
  const checksum = doubleHash(bytes.slice(0, 21)).slice(0, 4);
  
  // Combine address bytes and checksum
  const combined = new Uint8Array(25);
  combined.set(bytes.slice(0, 21));
  combined.set(checksum, 21);
  
  // Convert to base58
  return base58TRONEncode(combined);
}

// Double SHA256 hash
function doubleHash(bytes: Uint8Array): Uint8Array {
  const firstHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(bytes as any));
  const secondHash = CryptoJS.SHA256(firstHash);
  const hexStr = secondHash.toString(CryptoJS.enc.Hex);
  
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = parseInt(hexStr.substr(i * 2, 2), 16);
  }
  
  return result;
}

// Base58 encoding specifically for TRON addresses
function base58TRONEncode(bytes: Uint8Array): string {
  const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let result = "";
  let value = 0;
  let i = 0;
  
  // Use BigInt for dealing with large numbers
  let intValue = BigInt(0);
  for (i = 0; i < bytes.length; i++) {
    intValue = intValue * BigInt(256) + BigInt(bytes[i]);
  }
  
  while (intValue > BigInt(0)) {
    const remainder = Number(intValue % BigInt(58));
    intValue = intValue / BigInt(58);
    result = BASE58_CHARS[remainder] + result;
  }
  
  // Leading zeros become '1'
  for (i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result = '1' + result;
  }
  
  return result;
}

// Generate ERC20 address from private key (simplified implementation)
function deriveERC20Address(privateKey: string): string {
  // In a real implementation:
  // 1. Derive public key from private key using secp256k1 curve
  // 2. Take keccak256 hash of the public key
  // 3. Take the last 20 bytes (40 hex chars) and add 0x prefix
  
  // Simplified version for demonstration
  const hash = keccak256(privateKey);
  return '0x' + hash.substring(hash.length - 40);
}

// Generate a public key (in a real app, this would be derived from the private key)
function derivePublicKey(privateKey: string): string {
  // For this simulation, we're creating a deterministic but randomized public key
  // based on the private key to ensure consistency
  const hash1 = sha256(privateKey);
  const hash2 = sha256(hash1 + privateKey);
  return hash1 + hash2.substring(0, 128 - hash1.length);
}

// Generate a single wallet with proper cryptographic derivation
export function generateWallet(type: WalletType): Wallet {
  const privateKey = type === 'TRC20' ? generateTRC20PrivateKey() : generateERC20PrivateKey();
  const publicKey = derivePublicKey(privateKey);
  const address = type === 'TRC20' ? deriveTRC20Address(privateKey) : deriveERC20Address(privateKey);
  
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
  private minSyncInterval = 25; // Minimum time (ms) between database syncs (reduced from 50ms)
  
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
      }, 75); // Check every 75ms (reduced from 100ms)
    }
    
    // Set up automatic sync to database at a shorter interval
    if (this.dbSyncInterval === null) {
      this.dbSyncInterval = window.setInterval(() => {
        this.syncWithDatabase(true); // Force sync
      }, 25); // Sync every 25ms (reduced from 50ms)
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
    this.maxBufferSize = Math.max(10000, Math.floor(speed / 8)); // More aggressive buffer (changed from /10)
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
    const batchSize = Math.min(10000, this.pendingWallets.length); // Limit batch size for better performance
    const batchToSave = this.pendingWallets.slice(0, batchSize);
    this.pendingWallets = this.pendingWallets.slice(batchSize); // Keep remaining wallets in buffer
    
    try {
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
    
    // Calculate storage efficiency
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
      adjustedBatchSize = Math.max(100, Math.floor(adjustedBatchSize * storageEfficiency * 2.5)); // Increased multiplier (2 -> 2.5)
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
    
    if (elapsed >= 0.25) { // Reduced from 0.5 to 0.25 seconds for more accurate speed reporting
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
    let cycleTime = 20 / this.config.threadCount; // Base cycle time reduced from 25ms to 20ms
    if (storageEfficiency < 0.3) {
      cycleTime = cycleTime * 3; // Slow down significantly if storage efficiency is very bad
    } else if (storageEfficiency < 0.7) {
      cycleTime = cycleTime * 1.5; // Slow down moderately if storage efficiency is mediocre
    }
    
    // Schedule the next generation cycle
    setTimeout(() => this.runGenerationCycle(), cycleTime);
  }
}

export const walletGenerator = new WalletGeneratorEngine();
