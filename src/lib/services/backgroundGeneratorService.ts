
import { Wallet, WalletType } from '../types';
import { walletDB } from '../database';

// Type for background generation state
export interface BackgroundGenState {
  isRunning: boolean;
  targetCount: number;
  generatedCount: number;
  startTime: Date | null;
  speed: number;
  progress: number;
  lastUpdate: Date | null;
  error: string | null;
}

class BackgroundGeneratorService {
  private worker: Worker | null = null;
  private isWorkerReady = false;
  private pendingWallets: Wallet[] = [];
  private saveInterval: number | null = null;
  private statusInterval: number | null = null;
  private initRetryCount = 0;
  private maxRetries = 3;
  
  private state: BackgroundGenState = {
    isRunning: false,
    targetCount: 0,
    generatedCount: 0,
    startTime: null,
    speed: 0,
    progress: 0,
    lastUpdate: null,
    error: null
  };
  
  private stateListeners: Set<(state: BackgroundGenState) => void> = new Set();
  
  constructor() {
    // Initialize the worker if we're in a browser
    if (typeof window !== 'undefined') {
      console.log('Initializing background generator service...');
      this.initWorker();
      
      // Add a beforeunload event listener to prevent accidental closing
      window.addEventListener('beforeunload', (e) => {
        if (this.state.isRunning) {
          const message = '钱包生成正在进行中，确定要离开吗？';
          e.preventDefault();
          e.returnValue = message;
          return message;
        }
      });
    }
  }
  
  private initWorker() {
    try {
      console.log('Creating wallet generator worker...');
      
      // Create worker with error handling
      this.worker = new Worker(new URL('../workers/walletGeneratorWorker.ts', import.meta.url), { type: 'module' });
      
      this.worker.addEventListener('message', this.handleWorkerMessage);
      this.worker.addEventListener('error', this.handleWorkerError);
      
      // Set up periodic saving of pending wallets
      this.saveInterval = window.setInterval(() => {
        this.savePendingWallets();
      }, 200);
      
      // Set up periodic status updates
      this.statusInterval = window.setInterval(() => {
        if (this.isWorkerReady && this.worker && this.state.isRunning) {
          this.worker.postMessage({ action: 'status' });
        }
      }, 1000);
      
      console.log('Worker initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize wallet generator worker:', error);
      this.updateState({
        error: `初始化钱包生成器失败: ${error instanceof Error ? error.message : String(error)}`
      });
      
      // Retry initialization after delay if we haven't reached max retries
      if (this.initRetryCount < this.maxRetries) {
        this.initRetryCount++;
        console.log(`Retrying worker initialization (attempt ${this.initRetryCount}/${this.maxRetries})...`);
        setTimeout(() => this.initWorker(), 2000);
      }
    }
  }
  
  private handleWorkerError = (event: ErrorEvent) => {
    console.error('Worker error:', event);
    this.updateState({
      error: `钱包生成器工作线程错误: ${event.message || '未知错误'}`
    });
    
    // Attempt to restart the worker
    this.restartWorker();
  };
  
  private restartWorker() {
    console.log('Attempting to restart worker...');
    
    // Terminate the current worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.isWorkerReady = false;
    
    // Reinitialize the worker
    setTimeout(() => this.initWorker(), 1000);
  }
  
  private handleWorkerMessage = (event: MessageEvent) => {
    const { action, data } = event.data;
    
    switch (action) {
      case 'ready':
        console.log('Worker is ready');
        this.isWorkerReady = true;
        this.updateState({ error: null });
        break;
      
      case 'wallets':
        // Add new wallets to pending list
        this.pendingWallets.push(...data.wallets);
        
        // Update state
        this.updateState({
          generatedCount: data.generatedCount || this.state.generatedCount,
          speed: data.speed || this.state.speed,
          lastUpdate: new Date(),
          error: null
        });
        
        // If generation is complete, mark as not running
        if (data.isDone) {
          this.updateState({ 
            isRunning: false,
            progress: 100
          });
        }
        
        // Save wallets in the background
        this.savePendingWallets();
        break;
      
      case 'status':
        this.updateState({
          generatedCount: data.generatedCount,
          progress: data.progress,
          lastUpdate: new Date(),
          error: null
        });
        break;
      
      case 'completed':
        this.updateState({ 
          isRunning: false,
          generatedCount: data.generatedCount,
          progress: 100,
          lastUpdate: new Date(),
          error: null
        });
        break;
      
      case 'stopped':
        this.updateState({ 
          isRunning: false,
          lastUpdate: new Date()
        });
        break;
        
      case 'error':
        console.error('Worker reported error:', data.message);
        this.updateState({
          error: data.message
        });
        break;
    }
  };
  
  private async savePendingWallets() {
    if (this.pendingWallets.length === 0) return;
    
    const walletsToSave = [...this.pendingWallets];
    this.pendingWallets = [];
    
    try {
      await walletDB.storeWallets(walletsToSave);
    } catch (error) {
      console.error('Failed to save pending wallets:', error);
      // Put the wallets back in the queue
      this.pendingWallets = [...walletsToSave, ...this.pendingWallets];
      
      this.updateState({
        error: `保存钱包数据失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  private updateState(partialState: Partial<BackgroundGenState>) {
    this.state = { ...this.state, ...partialState };
    
    // Notify all listeners
    this.stateListeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }
  
  public startGeneration(count: number, walletTypes: WalletType[] = ['TRC20', 'ERC20'], trc20Ratio: number = 50) {
    if (!this.worker) {
      console.error('Worker is not initialized');
      this.updateState({
        error: '钱包生成器未初始化，请刷新页面重试'
      });
      return;
    }
    
    if (!this.isWorkerReady) {
      console.error('Worker is not ready');
      this.updateState({
        error: '钱包生成器未就绪，请等待几秒后重试'
      });
      return;
    }
    
    if (this.state.isRunning) {
      console.warn('Generation is already running');
      return;
    }
    
    this.updateState({
      isRunning: true,
      targetCount: count,
      generatedCount: 0,
      startTime: new Date(),
      speed: 0,
      progress: 0,
      error: null
    });
    
    console.log(`Starting generation of ${count} wallets with types:`, walletTypes, `TRC20 ratio: ${trc20Ratio}%`);
    
    this.worker.postMessage({
      action: 'start',
      data: {
        count,
        types: walletTypes,
        trc20Ratio
      }
    });
  }
  
  public stopGeneration() {
    if (!this.worker || !this.isWorkerReady || !this.state.isRunning) {
      return;
    }
    
    this.worker.postMessage({ action: 'stop' });
  }
  
  public subscribeTo(listener: (state: BackgroundGenState) => void): () => void {
    this.stateListeners.add(listener);
    
    // Immediately notify with current state
    listener(this.state);
    
    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(listener);
    };
  }
  
  public getState(): BackgroundGenState {
    return { ...this.state };
  }
  
  public isRunning(): boolean {
    return this.state.isRunning;
  }
  
  public dispose() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    if (this.saveInterval !== null) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    
    if (this.statusInterval !== null) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    
    this.stateListeners.clear();
  }
}

// Create and export singleton instance
export const backgroundGenerator = new BackgroundGeneratorService();
