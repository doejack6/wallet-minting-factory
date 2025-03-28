
import { GeneratorConfig, Wallet, WalletType } from './types';
import { generateTRC20Wallet } from './wallets/trc20';
import { generateERC20Wallet } from './wallets/erc20';

// 声明全局window对象上的服务器配置属性
declare global {
  interface Window {
    SERVER_CPU_CORES?: string;
    SERVER_MEMORY_MB?: string;
    isWorkerSupported?: boolean;
    isIndexedDBSupported?: boolean;
  }
}

/**
 * 钱包生成器类 - 负责生成不同类型的加密钱包
 */
class WalletGenerator {
  private config: GeneratorConfig;
  private isGenerating: boolean = false;
  private generatedWallets: Wallet[] = [];
  private typeCounts: Record<WalletType, number> = {
    TRC20: 0,
    ERC20: 0
  };
  private startTime: number = 0;
  private totalGenerated: number = 0;
  private todayGenerated: number = 0;
  private lastBatchTime: number = 0;
  private currentSpeed: number = 0;

  constructor() {
    // 默认配置
    this.config = {
      trc20Ratio: 50,
      threadCount: 4,
      batchSize: 500,
      memoryLimit: 8192,
      walletTypes: ['TRC20', 'ERC20']
    };
    
    // 在初始化时自动配置
    this.autoConfigureForDevice();
  }

  /**
   * 根据设备性能自动配置生成器参数
   */
  public autoConfigureForDevice(): GeneratorConfig {
    const newConfig = { ...this.config };
    
    // 优先使用全局服务器配置（从 window 对象获取）
    const serverCpuCores = window.SERVER_CPU_CORES ? Number(window.SERVER_CPU_CORES) : undefined;
    const serverMemoryMB = window.SERVER_MEMORY_MB ? Number(window.SERVER_MEMORY_MB) : undefined;
    
    // 获取设备信息（服务器配置或浏览器能力）
    const cores = serverCpuCores || navigator.hardwareConcurrency || 4;
    const memory = serverMemoryMB || (navigator.deviceMemory ? Math.floor(navigator.deviceMemory) * 1024 : 4096);
    
    console.log(`系统检测到的环境参数:
      CPU核心数: ${cores} ${serverCpuCores ? '(来自服务器配置)' : '(来自浏览器)'}
      内存: ${memory}MB ${serverMemoryMB ? '(来自服务器配置)' : '(来自浏览器)'}`);
    
    // 根据CPU核心数智能调整配置
    if (cores >= 32) {
      newConfig.threadCount = 16;
      newConfig.batchSize = 2000;
      newConfig.memoryLimit = Math.min(memory, 32768);
    } else if (cores >= 16) {
      newConfig.threadCount = 8;
      newConfig.batchSize = 1000;
      newConfig.memoryLimit = Math.min(memory, 16384);
    } else if (cores >= 8) {
      newConfig.threadCount = 4;
      newConfig.batchSize = 500;
      newConfig.memoryLimit = Math.min(memory, 8192);
    } else if (cores >= 4) {
      newConfig.threadCount = 2;
      newConfig.batchSize = 300;
      newConfig.memoryLimit = Math.min(memory, 4096);
    } else {
      // 低端设备配置
      newConfig.threadCount = 1;
      newConfig.batchSize = 200;
      newConfig.memoryLimit = Math.min(memory, 2048);
    }
    
    // 根据可用内存进一步调整批处理大小
    if (memory >= 32768) { // 32GB+
      newConfig.batchSize = Math.max(newConfig.batchSize, 2000);
    } else if (memory >= 16384) { // 16GB+
      newConfig.batchSize = Math.max(newConfig.batchSize, 1000);
    } else if (memory >= 8192) { // 8GB+
      newConfig.batchSize = Math.max(newConfig.batchSize, 500);
    } else if (memory < 2048) { // 低于2GB
      newConfig.batchSize = Math.min(newConfig.batchSize, 100);
      newConfig.threadCount = 1; // 低内存设备限制为单线程
    }
    
    console.log(`自动配置结果:
      线程数: ${newConfig.threadCount}
      批处理大小: ${newConfig.batchSize}
      内存限制: ${newConfig.memoryLimit}MB`);
    
    this.setConfig(newConfig);
    return newConfig;
  }

  // 设置配置
  public setConfig(config: Partial<GeneratorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 获取当前配置
  public getConfig(): GeneratorConfig {
    return { ...this.config };
  }

  // 开始生成钱包
  public start(): void {
    if (this.isGenerating) return;
    
    this.isGenerating = true;
    this.startTime = Date.now();
    this.generateNextBatch();
  }

  // 停止生成钱包
  public stop(): void {
    this.isGenerating = false;
  }

  // 生成指定数量的钱包
  public async generateWallets(count: number): Promise<Wallet[]> {
    const result: Wallet[] = [];
    const batchSize = Math.min(count, this.config.batchSize);
    
    for (let i = 0; i < count; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, count - i);
      const batch = await this.generateBatch(currentBatchSize);
      result.push(...batch);
    }
    
    return result;
  }

  // 生成一批钱包
  private async generateBatch(count: number): Promise<Wallet[]> {
    const result: Wallet[] = [];
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      const wallet = await this.generateWallet();
      if (wallet) {
        result.push(wallet);
        this.generatedWallets.push(wallet);
        this.totalGenerated++;
        this.todayGenerated++;
        this.typeCounts[wallet.type]++;
        
        // 限制存储的钱包数量，以避免内存溢出
        if (this.generatedWallets.length > this.config.memoryLimit / 10) {
          this.generatedWallets.shift();
        }
      }
    }
    
    // 计算生成速度
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // 转换为秒
    this.currentSpeed = duration > 0 ? Math.round(count / duration) : 0;
    this.lastBatchTime = endTime;
    
    return result;
  }

  // 异步生成下一批钱包
  private async generateNextBatch() {
    if (!this.isGenerating) return;
    
    await this.generateBatch(this.config.batchSize);
    
    // 使用requestAnimationFrame或setTimeout来避免界面冻结
    if (this.isGenerating) {
      setTimeout(() => this.generateNextBatch(), 0);
    }
  }

  // 生成单个钱包
  private async generateWallet(): Promise<Wallet | null> {
    try {
      // 根据配置的比例决定生成哪种类型的钱包
      const walletTypes = this.config.walletTypes;
      if (!walletTypes || walletTypes.length === 0) return null;
      
      let walletType: WalletType;
      
      if (walletTypes.length === 1) {
        walletType = walletTypes[0];
      } else {
        // 多种类型时，根据trc20Ratio决定生成哪种类型
        const randomValue = Math.random() * 100;
        walletType = randomValue < this.config.trc20Ratio ? 'TRC20' : 'ERC20';
      }
      
      // 根据类型生成钱包
      let wallet: Wallet;
      if (walletType === 'TRC20') {
        wallet = await generateTRC20Wallet();
      } else {
        wallet = await generateERC20Wallet();
      }
      
      return wallet;
    } catch (error) {
      console.error('Error generating wallet:', error);
      return null;
    }
  }

  // 检查是否正在生成
  public isRunning(): boolean {
    return this.isGenerating;
  }

  // 获取最近生成的钱包
  public getLastBatch(count: number = 10): Wallet[] {
    const length = this.generatedWallets.length;
    const startIndex = Math.max(0, length - count);
    return this.generatedWallets.slice(startIndex);
  }

  // 获取总生成数量
  public getTotalGenerated(): number {
    return this.totalGenerated;
  }

  // 获取今日生成数量
  public getTodayGenerated(): number {
    return this.todayGenerated;
  }

  // 获取特定类型钱包的数量
  public getTypeCount(type: WalletType): number {
    return this.typeCounts[type] || 0;
  }

  // 获取当前生成速度
  public getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  // 获取运行时间（秒）
  public getUptime(): number {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  // 重置统计信息
  public resetStats(): void {
    this.generatedWallets = [];
    this.typeCounts = { TRC20: 0, ERC20: 0 };
    this.totalGenerated = 0;
    this.todayGenerated = 0;
    this.startTime = 0;
    this.currentSpeed = 0;
  }
}

// 创建单例实例
export const walletGenerator = new WalletGenerator();
