import { Wallet, WalletType, GeneratorConfig } from './types';
import { walletDB } from './database';
import { generateTRC20PrivateKey, deriveTRC20Address, derivePublicKeyFromPrivate as deriveTRC20PublicKey } from './wallets/trc20';
import { generateERC20PrivateKey, deriveERC20Address, derivePublicKeyFromPrivate as deriveERC20PublicKey } from './wallets/erc20';
import { generateRandomBytes, bytesToHex } from './crypto/random';

function generateRandomKeys(count: number, size: number = 32): string[] {
  const bytes = generateRandomBytes(count * size);
  const keys: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const start = i * size;
    const keyBytes = bytes.slice(start, start + size);
    
    keyBytes[0] = keyBytes[0] & 0x7F;
    
    keys.push(bytesToHex(keyBytes));
  }
  
  return keys;
}

export function generateWallet(type: WalletType): Wallet {
  let privateKey, publicKey, address;
  
  if (type === 'TRC20') {
    privateKey = generateTRC20PrivateKey();
    publicKey = deriveTRC20PublicKey(privateKey);
    address = deriveTRC20Address(privateKey);
  } else {
    privateKey = generateERC20PrivateKey();
    publicKey = deriveERC20PublicKey(privateKey);
    address = deriveERC20Address(privateKey);
  }
  
  return {
    id: crypto.randomUUID(),
    address,
    privateKey,
    publicKey,
    type,
    createdAt: new Date(),
  };
}

export function generateWalletBatch(count: number, type: WalletType): Wallet[] {
  if (count < 10) {
    const wallets: Wallet[] = [];
    for (let i = 0; i < count; i++) {
      wallets.push(generateWallet(type));
    }
    return wallets;
  }
  
  const privateKeys = generateRandomKeys(count);
  const wallets: Wallet[] = [];
  const now = new Date();
  
  if (type === 'TRC20') {
    for (let i = 0; i < count; i++) {
      const privateKey = privateKeys[i];
      const publicKey = deriveTRC20PublicKey(privateKey);
      const address = deriveTRC20Address(privateKey);
      
      wallets.push({
        id: crypto.randomUUID(),
        address,
        privateKey,
        publicKey,
        type,
        createdAt: now,
      });
    }
  } else {
    for (let i = 0; i < count; i++) {
      const privateKey = privateKeys[i];
      const publicKey = deriveERC20PublicKey(privateKey);
      const address = deriveERC20Address(privateKey);
      
      wallets.push({
        id: crypto.randomUUID(),
        address,
        privateKey,
        publicKey,
        type,
        createdAt: now,
      });
    }
  }
  
  return wallets;
}

export class WalletGeneratorEngine {
  private running = false;
  private wallets: Wallet[] = [];
  private generationSpeed = 0;
  private targetSpeed = 10000;
  private generatedCount = 0;
  private realGeneratedCount = 0; 
  private savedToDbCount = 0;
  private startTime: Date | null = null;
  private lastSpeedUpdate = 0;
  private lastSample = 0;
  private todayGenerated = 0;
  private onProgress: ((stats: { count: number, speed: number, savedCount: number }) => void) | null = null;
  private syncInterval: number | null = null;
  private dbSyncInterval: number | null = null;
  private maxBufferSize = 1000;
  private lastSyncTime = 0; 
  private minSyncInterval = 100;
  private throttleFactor = 1.0;
  private pendingWallets: Wallet[] = [];
  private directSaveMode = true;
  private lastError: Error | null = null;
  private errorHandled = false;
  private config: GeneratorConfig = {
    trc20Ratio: 50,
    threadCount: 2,
    batchSize: 100,
    memoryLimit: 512,
    walletTypes: ['TRC20', 'ERC20'],
  };
  
  constructor() {
    this.resetDailyCount();
    
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeToMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCount();
      setInterval(() => this.resetDailyCount(), 24 * 60 * 60 * 1000);
    }, timeToMidnight);
    
    if (typeof window !== 'undefined') {
      window.addEventListener('walletsStored', (e: any) => {
        this.savedToDbCount = e.detail.total;
        console.log(`WalletGenerator: Updated saved count to ${this.savedToDbCount}`);
      });
      
      window.addEventListener('databaseCleared', () => {
        this.savedToDbCount = 0;
        this.pendingWallets = [];
        console.log('WalletGenerator: Database cleared event received');
      });
      
      if (typeof Worker === 'undefined') {
        console.error('当前环境不支持Web Worker API，钱包生成器可能无法正常工作！');
        this.setLastError(new Error('当前环境不支持Web Worker API，钱包生成器无法正常工作'));
      }
    }
    
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
  
  public autoConfigureForDevice(): GeneratorConfig {
    const newConfig = { ...this.config };
    
    const cores = navigator.hardwareConcurrency || 4;
    
    if (cores >= 32) {
      newConfig.threadCount = 12;
      newConfig.batchSize = 1000;
      newConfig.memoryLimit = 16384;
    } else if (cores >= 16) {
      newConfig.threadCount = 8;
      newConfig.batchSize = 800;
      newConfig.memoryLimit = 8192;
    } else if (cores >= 8) {
      newConfig.threadCount = 4;
      newConfig.batchSize = 500;
      newConfig.memoryLimit = 4096;
    } else if (cores >= 4) {
      newConfig.threadCount = 2;
      newConfig.batchSize = 200;
      newConfig.memoryLimit = 2048;
    } else {
      newConfig.threadCount = 1;
      newConfig.batchSize = 100;
      newConfig.memoryLimit = 1024;
    }
    
    console.log(`自动配置: 检测到 ${cores} 核心CPU, 设置线程数: ${newConfig.threadCount}, 批处理: ${newConfig.batchSize}, 内存限制: ${newConfig.memoryLimit}MB`);
    
    this.setConfig(newConfig);
    return newConfig;
  }
  
  public setConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
    this.config.batchSize = Math.min(this.config.batchSize, 200);
    this.maxBufferSize = Math.max(500, this.config.batchSize * 2);
  }
  
  public getConfig(): GeneratorConfig {
    return { ...this.config };
  }
  
  public start(): void {
    if (this.running) return;
    
    if (this.lastError && !this.errorHandled) {
      console.error('Generator has unhandled error:', this.lastError);
      throw this.lastError;
    }
    
    try {
      this.running = true;
      this.startTime = new Date();
      this.lastSpeedUpdate = Date.now();
      this.lastSample = this.generatedCount;
      this.lastSyncTime = Date.now();
      
      this.synchronizeWithDatabase();
      
      if (this.syncInterval === null) {
        this.syncInterval = window.setInterval(() => {
          this.synchronizeWithDatabase();
        }, 1000);
      }
      
      if (this.dbSyncInterval === null && !this.directSaveMode) {
        this.dbSyncInterval = window.setInterval(() => {
          this.syncWithDatabase(false);
        }, 200);
      }
      
      this.errorHandled = true;
      this.runGenerationCycle();
    } catch (error) {
      this.running = false;
      this.setLastError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
  
  public stop(): void {
    this.running = false;
    
    if (this.pendingWallets.length === 0) return;
    
    this.savePendingWallets(true);
    
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
    if (speed > 500000) {
      this.config.batchSize = 100;
      this.maxBufferSize = 500;
    } else if (speed > 100000) {
      this.config.batchSize = 50;
      this.maxBufferSize = 300;
    } else {
      this.config.batchSize = 20;
      this.maxBufferSize = 200;
    }
  }
  
  public getLastBatch(limit: number = 100): Wallet[] {
    return this.wallets.slice(-limit);
  }
  
  public resetGeneratedCount(): void {
    this.generatedCount = 0;
    this.realGeneratedCount = 0;
    this.todayGenerated = 0;
    this.pendingWallets = [];
  }
  
  public saveWallets(): void {
    this.savePendingWallets(true);
  }
  
  private async savePendingWallets(force: boolean = false): Promise<void> {
    if (this.pendingWallets.length === 0) return;
    
    try {
      await walletDB.storeWallets(this.pendingWallets);
      
      this.wallets = [...this.wallets, ...this.pendingWallets].slice(-100);
      
      this.pendingWallets = [];
      
      this.savedToDbCount = walletDB.getTotalCount();
      
      if (this.onProgress) {
        this.onProgress({
          count: this.realGeneratedCount,
          speed: this.generationSpeed,
          savedCount: this.savedToDbCount
        });
      }
      
      console.log(`Generator: Saved ${this.pendingWallets.length} wallets. Total saved: ${this.savedToDbCount}`);
    } catch (error) {
      console.error('Failed to save wallets to database', error);
      if (force) {
        setTimeout(() => this.savePendingWallets(true), 500);
      }
    }
  }
  
  private async syncWithDatabase(force: boolean = false): Promise<void> {
    if (!this.running && !force) return;
    
    if (this.pendingWallets.length === 0) return;
    
    try {
      await this.savePendingWallets();
    } catch (error) {
      console.error('Failed to sync wallets with database', error);
    }
  }
  
  private async runGenerationCycle(): Promise<void> {
    if (!this.running) return;
    
    try {
      const cycleSpeed = Math.min(this.targetSpeed, 10000);
      const batchSize = Math.min(this.config.batchSize, 100);
      let newBatch: Wallet[] = [];
      
      if (this.config.walletTypes.includes('TRC20') && this.config.walletTypes.includes('ERC20')) {
        const trc20Count = Math.round(batchSize * (this.config.trc20Ratio / 100));
        const erc20Count = batchSize - trc20Count;
        
        const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
        const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
        
        newBatch = [...trc20Batch, ...erc20Batch];
      } else if (this.config.walletTypes.includes('TRC20')) {
        newBatch = generateWalletBatch(batchSize, 'TRC20');
      } else if (this.config.walletTypes.includes('ERC20')) {
        newBatch = generateWalletBatch(batchSize, 'ERC20');
      } else {
        const trc20Count = Math.round(batchSize * (this.config.trc20Ratio / 100));
        const erc20Count = batchSize - trc20Count;
        
        const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
        const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
        
        newBatch = [...trc20Batch, ...erc20Batch];
      }
      
      this.generatedCount += newBatch.length;
      this.realGeneratedCount += newBatch.length;
      this.todayGenerated += newBatch.length;
      
      this.pendingWallets.push(...newBatch);
      
      if (this.directSaveMode) {
        await this.savePendingWallets();
      }
      
      const now = Date.now();
      const elapsed = (now - this.lastSpeedUpdate) / 1000;
      
      if (elapsed >= 0.5) {
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
      
      const targetCycleTime = 1000 / (cycleSpeed / batchSize);
      const minCycleTime = 10;
      const cycleTime = Math.max(minCycleTime, targetCycleTime);
      
      setTimeout(() => this.runGenerationCycle(), cycleTime);
    } catch (error) {
      console.error('Error in generation cycle:', error);
      this.setLastError(error instanceof Error ? error : new Error(String(error)));
      
      if (this.running) {
        setTimeout(() => this.runGenerationCycle(), 1000);
      }
    }
  }
  
  private setLastError(error: Error): void {
    this.lastError = error;
    this.errorHandled = false;
    console.error('WalletGenerator error:', error);
  }
  
  public getLastError(): Error | null {
    return this.lastError;
  }
  
  public resetError(): void {
    this.lastError = null;
    this.errorHandled = true;
  }
}

export const walletGenerator = new WalletGeneratorEngine();
