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
  private targetSpeed = 100000; // 目标10万每秒
  private generatedCount = 0;
  private realGeneratedCount = 0; // UI显示的实际计数
  private savedToDbCount = 0;
  private startTime: Date | null = null;
  private lastSpeedUpdate = 0;
  private lastSample = 0;
  private todayGenerated = 0;
  private onProgress: ((stats: { count: number, speed: number, savedCount: number }) => void) | null = null;
  private syncInterval: number | null = null;
  private dbSyncInterval: number | null = null;
  private addressSet: Set<string> = new Set(); // 用于跟踪唯一地址
  private pendingWallets: Wallet[] = []; // 待保存钱包的缓冲区
  private maxBufferSize = 10000; // 与数据库同步前的最大缓冲区大小
  private lastSyncTime = 0; // 上次与数据库同步的时间
  private minSyncInterval = 25; // 数据库同步之间的最小时间(毫秒)
  
  // 高级配置选项
  private config: GeneratorConfig = {
    trc20Ratio: 50, // 50% TRC20
    threadCount: 4,
    batchSize: 1000,
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
    // 更新缓冲区大小基于批处理大小
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
    
    // 确保数据库计数正确后再启动
    this.synchronizeWithDatabase();
    
    // 设置更频繁的数据库同步以提高准确性
    if (this.syncInterval === null) {
      this.syncInterval = window.setInterval(() => {
        this.synchronizeWithDatabase();
      }, 75); // 每75ms检查一次（减少为100ms）
    }
    
    // 设置自动数据库同步到更频繁的间隔
    if (this.dbSyncInterval === null) {
      this.dbSyncInterval = window.setInterval(() => {
        this.syncWithDatabase(true); // 强制同步
      }, 25); // 每25ms同步一次（减少为50ms）
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
    this.maxBufferSize = Math.max(10000, Math.floor(speed / 8)); // 更加激进的缓冲区（从/10改为/8）
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
    const batchSize = Math.min(10000, this.pendingWallets.length); // 限制批处理大小以提高性能
    const batchToSave = this.pendingWallets.slice(0, batchSize);
    this.pendingWallets = this.pendingWallets.slice(batchSize); // 保持剩余钱包在缓冲区中
    
    try {
      // 直接将钱包保存到数据库
      await walletDB.storeWallets(batchToSave);
      
      // 保留最近的几个钱包以供显示
      this.wallets = [...this.wallets, ...batchToSave].slice(-1000);
      
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
    
    // 计算存储效率
    const storageEfficiency = this.savedToDbCount > 0 && this.realGeneratedCount > 0 
      ? this.savedToDbCount / this.realGeneratedCount 
      : 1;
    
    // 如果存储效率低，则减少批处理大小以允许数据库赶上
    let adjustedBatchSize = Math.min(
      this.config.batchSize, 
      Math.floor(this.targetSpeed / 20)
    );
    
    // 如果存储效率低于50%，则按比例减少批处理大小
    if (storageEfficiency < 0.5) {
      adjustedBatchSize = Math.max(100, Math.floor(adjustedBatchSize * storageEfficiency * 2.5)); // 增加乘数（2 -> 2.5）
    }
    
    const trc20Count = Math.round(adjustedBatchSize * (this.config.trc20Ratio / 100));
    const erc20Count = adjustedBatchSize - trc20Count;
    
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
    
    if (elapsed >= 0.25) { // 减少为0.25秒以更准确地报告速度
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
    }
    
    // 根据存储效率调整生成周期时间
    // 如果存储效率低，则显著减慢周期时间
    let cycleTime = 20 / this.config.threadCount; // 基础周期时间减少为20ms
    if (storageEfficiency < 0.3) {
      cycleTime = cycleTime * 3; // 如果存储效率非常差，则显著减慢周期时间
    } else if (storageEfficiency < 0.7) {
      cycleTime = cycleTime * 1.5; // 如果存储效率一般，则适度减慢周期时间
    }
    
    // 安排下一个生成周期
    setTimeout(() => this.runGenerationCycle(), cycleTime);
  }
}

// 单例实例
export const walletGenerator = new WalletGeneratorEngine();
