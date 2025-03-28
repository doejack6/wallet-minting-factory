import { Wallet, WalletType, GeneratorConfig } from './types';
import { walletDB } from './database';
import { generateTRC20PrivateKey, deriveTRC20Address, derivePublicKeyFromPrivate as deriveTRC20PublicKey } from './wallets/trc20';
import { generateERC20PrivateKey, deriveERC20Address, derivePublicKeyFromPrivate as deriveERC20PublicKey } from './wallets/erc20';
import { generateRandomBytes, bytesToHex } from './crypto/random';

// 使用更高效的密钥生成 - 批量生成随机字节
function generateRandomKeys(count: number, size: number = 32): string[] {
  const bytes = generateRandomBytes(count * size);
  const keys: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const start = i * size;
    const keyBytes = bytes.slice(start, start + size);
    
    // 确保私钥在有效范围内
    keyBytes[0] = keyBytes[0] & 0x7F; // 清除第一个字节的最高位
    
    keys.push(bytesToHex(keyBytes));
  }
  
  return keys;
}

// 高性能单个钱包生成
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

// 优化的批量钱包生成 - 使用高效算法
export function generateWalletBatch(count: number, type: WalletType): Wallet[] {
  // 对于小批量使用常规方法
  if (count < 10) {
    const wallets: Wallet[] = [];
    for (let i = 0; i < count; i++) {
      wallets.push(generateWallet(type));
    }
    return wallets;
  }
  
  // 对于大批量使用优化方法
  const privateKeys = generateRandomKeys(count);
  const wallets: Wallet[] = [];
  const now = new Date();
  
  // 为了最大性能，使用类型特定的批处理逻辑
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
  private maxBufferSize = 1000; // 缓冲区大小
  private lastSyncTime = 0; 
  private minSyncInterval = 100; // 同步间隔时间
  private throttleFactor = 1.0; // 节流因子，用于自动调整生成速度
  private pendingWallets: Wallet[] = []; // 待保存的钱包
  private directSaveMode = true; // 启用直接保存模式，确保生成多少保存多少
  
  // 高级配置选项
  private config: GeneratorConfig = {
    trc20Ratio: 50, // 50% TRC20
    threadCount: 2, // 线程数降低到2
    batchSize: 100, // 批处理大小降低到100，确保每个批次都能快速保存
    memoryLimit: 512, // MB
    walletTypes: ['TRC20', 'ERC20'], // 默认生成两种类型
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
  
  // 新增方法：自动配置根据设备性能优化
  public autoConfigureForDevice(): GeneratorConfig {
    const newConfig = { ...this.config };
    
    // 检测设备性能并配置
    // 更新配置以支持高端服务器
    
    const cores = navigator.hardwareConcurrency || 4;
    
    // 根据CPU核心数设置线程
    if (cores >= 32) {
      newConfig.threadCount = 12;
      newConfig.batchSize = 1000;
      newConfig.memoryLimit = 16384; // 16GB
    } else if (cores >= 16) {
      newConfig.threadCount = 8;
      newConfig.batchSize = 800;
      newConfig.memoryLimit = 8192; // 8GB
    } else if (cores >= 8) {
      newConfig.threadCount = 4;
      newConfig.batchSize = 500;
      newConfig.memoryLimit = 4096; // 4GB
    } else if (cores >= 4) {
      newConfig.threadCount = 2;
      newConfig.batchSize = 200;
      newConfig.memoryLimit = 2048; // 2GB
    } else {
      newConfig.threadCount = 1;
      newConfig.batchSize = 100;
      newConfig.memoryLimit = 1024; // 1GB
    }
    
    console.log(`自动配置: 检测到 ${cores} 核心CPU, 设置线程数: ${newConfig.threadCount}, 批处理: ${newConfig.batchSize}, 内存限制: ${newConfig.memoryLimit}MB`);
    
    // 应用新配置
    this.setConfig(newConfig);
    return newConfig;
  }
  
  public setConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
    // 更新批处理大小，保持较小数值确保高效保存
    this.config.batchSize = Math.min(this.config.batchSize, 200);
    // 更新缓冲区大小
    this.maxBufferSize = Math.max(500, this.config.batchSize * 2);
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
    
    // 数据库同步
    if (this.syncInterval === null) {
      this.syncInterval = window.setInterval(() => {
        this.synchronizeWithDatabase();
      }, 1000);
    }
    
    // 设置自动数据库同步
    if (this.dbSyncInterval === null && !this.directSaveMode) {
      this.dbSyncInterval = window.setInterval(() => {
        this.syncWithDatabase(false);
      }, 200);
    }
    
    this.runGenerationCycle();
  }
  
  public stop(): void {
    this.running = false;
    
    // 确保所有待处理的钱包都保存到数据库
    this.savePendingWallets(true);
    
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
    // 根据目标速度调整批处理大小和缓冲区
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
    // 从最近的钱包中获取
    return this.wallets.slice(-limit);
  }
  
  public resetGeneratedCount(): void {
    this.generatedCount = 0;
    this.realGeneratedCount = 0;
    this.todayGenerated = 0;
    this.pendingWallets = [];
  }
  
  public saveWallets(): void {
    // 手动保存当前所有待保存的钱包
    this.savePendingWallets(true);
  }
  
  private async savePendingWallets(force: boolean = false) {
    if (this.pendingWallets.length === 0) return;
    
    try {
      // 确保钱包被保存到数据库
      await walletDB.storeWallets(this.pendingWallets);
      
      // 保留最近的几个钱包以供显示
      this.wallets = [...this.wallets, ...this.pendingWallets].slice(-100);
      
      // 清空待处理钱包
      this.pendingWallets = [];
      
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
      
      console.log(`Generator: Saved ${this.pendingWallets.length} wallets. Total saved: ${this.savedToDbCount}`);
    } catch (error) {
      console.error('Failed to save wallets to database', error);
      // 如果强制保存失败，则重试一次
      if (force) {
        setTimeout(() => this.savePendingWallets(true), 500);
      }
    }
  }
  
  private async syncWithDatabase(force: boolean = false) {
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
      // 计算当前生成速度
      const cycleSpeed = Math.min(this.targetSpeed, 10000); // 每个周期最多生成1万个钱包
      
      // 根据配置的比例计算两种钱包的数量
      const batchSize = Math.min(this.config.batchSize, 100); // 限制批处理大小，确保能高效保存
      let newBatch: Wallet[] = [];
      
      // 检查要生成哪些类型的钱包
      if (this.config.walletTypes.includes('TRC20') && this.config.walletTypes.includes('ERC20')) {
        // 生成两种类型
        const trc20Count = Math.round(batchSize * (this.config.trc20Ratio / 100));
        const erc20Count = batchSize - trc20Count;
        
        // 生成钱包
        const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
        const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
        
        newBatch = [...trc20Batch, ...erc20Batch];
      } else if (this.config.walletTypes.includes('TRC20')) {
        // 只生成TRC20
        newBatch = generateWalletBatch(batchSize, 'TRC20');
      } else if (this.config.walletTypes.includes('ERC20')) {
        // 只生成ERC20
        newBatch = generateWalletBatch(batchSize, 'ERC20');
      } else {
        // 如果没有选择类型，默认使用比率生成两种类型
        const trc20Count = Math.round(batchSize * (this.config.trc20Ratio / 100));
        const erc20Count = batchSize - trc20Count;
        
        // 生成钱包
        const trc20Batch = generateWalletBatch(trc20Count, 'TRC20');
        const erc20Batch = generateWalletBatch(erc20Count, 'ERC20');
        
        newBatch = [...trc20Batch, ...erc20Batch];
      }
      
      // 增加生成计数器
      this.generatedCount += newBatch.length;
      this.realGeneratedCount += newBatch.length;
      this.todayGenerated += newBatch.length;
      
      // 将钱包添加到待保存列表
      this.pendingWallets.push(...newBatch);
      
      // 直接保存模式：生成后立即保存到数据库，确保生成多少保存多少
      if (this.directSaveMode) {
        await this.savePendingWallets();
      }
      
      // 更新生成速度计算
      const now = Date.now();
      const elapsed = (now - this.lastSpeedUpdate) / 1000;
      
      if (elapsed >= 0.5) {
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
      
      // 计算新的周期时间 - 根据目标速度调整
      const targetCycleTime = 1000 / (cycleSpeed / batchSize);
      const minCycleTime = 10; // 最小周期时间10毫秒
      const cycleTime = Math.max(minCycleTime, targetCycleTime);
      
      // 安排下一个生成周期
      setTimeout(() => this.runGenerationCycle(), cycleTime);
    } catch (error) {
      console.error('Error in generation cycle:', error);
      // 出错后延迟重试
      setTimeout(() => this.runGenerationCycle(), 1000);
    }
  }
}

// 单例实例
export const walletGenerator = new WalletGeneratorEngine();
