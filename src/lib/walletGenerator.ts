
import { Wallet, WalletType, GeneratorConfig } from './types';
import { walletDB } from './database';
import { generateTRC20PrivateKey, deriveTRC20Address, derivePublicKeyFromPrivate as deriveTRC20PublicKey } from './wallets/trc20';
import { generateERC20PrivateKey, deriveERC20Address, derivePublicKeyFromPrivate as deriveERC20PublicKey } from './wallets/erc20';

// 生成单个钱包
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

// 批量生成多个钱包
export function generateWalletBatch(count: number, type: WalletType): Wallet[] {
  const wallets: Wallet[] = [];
  for (let i = 0; i < count; i++) {
    wallets.push(generateWallet(type));
  }
  return wallets;
}

// 钱包生成引擎类
export class WalletGeneratorEngine {
  private running = false;
  private wallets: Wallet[] = [];
  private generationSpeed = 0;
  private targetSpeed = 10000; // 默认值降低到1万每秒
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
  private addressSet: Set<string> = new Set(); 
  private pendingWallets: Wallet[] = []; 
  private maxBufferSize = 1000; // 缓冲区大小降低到1000
  private lastSyncTime = 0; 
  private minSyncInterval = 100; // 增加同步间隔时间到100ms
  private throttleFactor = 1.0; // 节流因子，用于自动调整生成速度
  
  // 高级配置选项
  private config: GeneratorConfig = {
    trc20Ratio: 50, // 50% TRC20
    threadCount: 2, // 降低到2
    batchSize: 500, // 降低到500
    memoryLimit: 512, // MB
  };
  
  constructor() {
    // 初始化引擎
    this.resetDailyCount();
    
    // 重置今天计数器
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeToMidnight = midnight.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCount();
      // 设置每日重置
      setInterval(() => this.resetDailyCount(), 24 * 60 * 60 * 1000);
    }, timeToMidnight);
    
    // 监听数据库事件
    if (typeof window !== 'undefined') {
      window.addEventListener('walletsStored', (e: any) => {
        this.savedToDbCount = e.detail.total;
        // 计算存储效率并调整速度
        this.adjustGenerationRate();
        console.log(`WalletGenerator: Updated saved count to ${this.savedToDbCount}`);
      });
      
      window.addEventListener('databaseCleared', () => {
        this.savedToDbCount = 0;
        this.addressSet.clear();
        this.pendingWallets = [];
        console.log('WalletGenerator: Database cleared event received');
      });
    }
    
    // 初始化与数据库同步
    this.synchronizeWithDatabase();
  }
  
  // 自动调整生成速率
  private adjustGenerationRate(): void {
    if (this.realGeneratedCount <= 0) return;
    
    const efficiency = this.savedToDbCount / this.realGeneratedCount;
    
    // 根据存储效率来调整节流因子
    if (efficiency < 0.3) {
      // 效率很低，大幅降低速度
      this.throttleFactor = Math.max(0.1, this.throttleFactor * 0.5);
      console.log(`Efficiency very low (${(efficiency * 100).toFixed(1)}%), reducing generation speed by 50%. New throttle: ${this.throttleFactor.toFixed(2)}`);
    } else if (efficiency < 0.6) {
      // 效率较低，适度降低速度
      this.throttleFactor = Math.max(0.3, this.throttleFactor * 0.8);
      console.log(`Efficiency low (${(efficiency * 100).toFixed(1)}%), reducing generation speed by 20%. New throttle: ${this.throttleFactor.toFixed(2)}`);
    } else if (efficiency > 0.9 && this.throttleFactor < 1.0) {
      // 效率很高，可以适当提高速度
      this.throttleFactor = Math.min(1.0, this.throttleFactor * 1.2);
      console.log(`Efficiency good (${(efficiency * 100).toFixed(1)}%), increasing generation speed by 20%. New throttle: ${this.throttleFactor.toFixed(2)}`);
    }
  }
  
  private async synchronizeWithDatabase() {
    try {
      this.savedToDbCount = walletDB.getTotalCount();
      // 初始化后计算存储效率
      if (this.realGeneratedCount > 0) {
        this.adjustGenerationRate();
      }
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
    // 更新缓冲区大小基于批处理大小
    this.maxBufferSize = Math.max(1000, this.config.batchSize * 2); // 降低系数
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
    this.throttleFactor = 1.0; // 重置节流因子
    
    // 确保数据库计数正确后再启动
    this.synchronizeWithDatabase();
    
    // 设置更频繁的数据库同步以提高准确性
    if (this.syncInterval === null) {
      this.syncInterval = window.setInterval(() => {
        this.synchronizeWithDatabase();
      }, 500); // 增加到500ms
    }
    
    // 设置自动数据库同步到更频繁的间隔
    if (this.dbSyncInterval === null) {
      this.dbSyncInterval = window.setInterval(() => {
        this.syncWithDatabase(false); // 不强制同步
      }, 200); // 增加到200ms
    }
    
    this.runGenerationCycle();
  }
  
  public stop(): void {
    this.running = false;
    
    // 最终在停止前同步
    this.syncWithDatabase(true);
    
    // 清除同步间隔
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
    // 估计基于比率
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
    // 调整缓冲区大小基于目标速度
    this.maxBufferSize = Math.max(1000, Math.floor(speed / 20)); // 更加保守的缓冲区
  }
  
  public getLastBatch(limit: number = 100): Wallet[] {
    // 从待保存钱包和最近保存的钱包中获取
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
    // 只有在足够时间过去或缓冲区足够大或强制同步时才同步
    if (!force && now - this.lastSyncTime < this.minSyncInterval && this.pendingWallets.length < this.maxBufferSize) {
      return;
    }
    
    if (this.pendingWallets.length === 0) {
      return;
    }
    
    this.lastSyncTime = now;
    
    // 从缓冲区中取出钱包
    const batchSize = Math.min(1000, this.pendingWallets.length); // 限制批处理大小
    const batchToSave = this.pendingWallets.slice(0, batchSize);
    this.pendingWallets = this.pendingWallets.slice(batchSize); // 保持剩余钱包在缓冲区中
    
    try {
      // 直接将钱包保存到数据库
      await walletDB.storeWallets(batchToSave);
      
      // 保留最近的几个钱包以供显示
      this.wallets = [...this.wallets, ...batchToSave].slice(-100); // 减少保留数量
      
      // 更新保存计数从数据库
      this.savedToDbCount = walletDB.getTotalCount();
      
      // 如果设置了进度回调，则更新进度
      if (this.onProgress) {
        this.onProgress({
          count: this.realGeneratedCount,
          speed: this.generationSpeed,
          savedCount: this.savedToDbCount
        });
      }
    } catch (error) {
      console.error('Failed to sync wallets with database', error);
      // 将钱包放回缓冲区以进行重试
      this.pendingWallets = [...batchToSave, ...this.pendingWallets];
    }
  }
  
  private runGenerationCycle(): void {
    if (!this.running) return;
    
    // 计算当前的节流生成速度
    const throttledSpeed = Math.floor(this.targetSpeed * this.throttleFactor);
    
    // 计算存储效率
    const storageEfficiency = this.savedToDbCount > 0 && this.realGeneratedCount > 0 
      ? this.savedToDbCount / this.realGeneratedCount 
      : 1;
    
    // 根据存储效率动态调整批处理大小
    let adjustedBatchSize = Math.min(
      this.config.batchSize, 
      Math.floor(throttledSpeed / 10) // 更保守的批处理大小
    );
    
    // 如果存储效率低于30%，则显著减少批处理大小
    if (storageEfficiency < 0.3) {
      adjustedBatchSize = Math.max(50, Math.floor(adjustedBatchSize * 0.2)); 
      console.log(`Storage efficiency very low (${(storageEfficiency * 100).toFixed(1)}%), reducing batch size to ${adjustedBatchSize}`);
    } 
    // 如果存储效率低于70%，则适度减少批处理大小
    else if (storageEfficiency < 0.7) {
      adjustedBatchSize = Math.max(100, Math.floor(adjustedBatchSize * 0.5));
      console.log(`Storage efficiency low (${(storageEfficiency * 100).toFixed(1)}%), reducing batch size to ${adjustedBatchSize}`);
    }
    
    // 最小批量为10
    adjustedBatchSize = Math.max(10, adjustedBatchSize);
    
    // 根据配置的比例计算两种钱包的数量
    const trc20Count = Math.round(adjustedBatchSize * (this.config.trc20Ratio / 100));
    const erc20Count = adjustedBatchSize - trc20Count;
    
    // 生成钱包
    const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
    const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
    
    const newBatch = [...trc20Batch, ...erc20Batch];
    
    // 将钱包添加到待保存缓冲区
    this.pendingWallets.push(...newBatch);
    
    // 如果缓冲区超过最大大小，则触发数据库同步
    if (this.pendingWallets.length >= this.maxBufferSize) {
      this.syncWithDatabase();
    }
    
    // 增加生成计数器
    this.generatedCount += newBatch.length;
    this.realGeneratedCount += newBatch.length;
    this.todayGenerated += newBatch.length;
    
    // 更新生成速度计算
    const now = Date.now();
    const elapsed = (now - this.lastSpeedUpdate) / 1000;
    
    if (elapsed >= 0.5) { // 增加到0.5秒
      this.generationSpeed = Math.round((this.generatedCount - this.lastSample) / elapsed);
      this.lastSample = this.generatedCount;
      this.lastSpeedUpdate = now;
      
      // 如果设置了进度回调，则更新进度
      if (this.onProgress) {
        this.onProgress({
          count: this.realGeneratedCount,
          speed: this.generationSpeed,
          savedCount: this.savedToDbCount
        });
      }
      
      // 根据存储效率动态调整生成速率
      this.adjustGenerationRate();
    }
    
    // 根据存储效率调整生成周期时间
    // 如果存储效率低，则显著减慢周期时间
    let cycleTime = 50 / this.config.threadCount; // 基础周期时间增加到50ms
    
    if (storageEfficiency < 0.3) {
      cycleTime = cycleTime * 5; // 如果存储效率非常差，则显著减慢周期时间
    } else if (storageEfficiency < 0.7) {
      cycleTime = cycleTime * 2; // 如果存储效率一般，则适度减慢周期时间
    }
    
    // 安排下一个生成周期
    setTimeout(() => this.runGenerationCycle(), cycleTime);
  }
}

// 单例实例
export const walletGenerator = new WalletGeneratorEngine();
