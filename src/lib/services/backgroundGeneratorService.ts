
import { Wallet, WalletType } from '../types';
import { walletDB } from '../database';
import { indexedDBStorage } from '../storage/indexedDBStorage';

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
  savedCount: number; // Add tracking for saved wallets
}

class BackgroundGeneratorService {
  private worker: Worker | null = null;
  private isWorkerReady = false;
  private pendingWallets: Wallet[] = [];
  private saveInterval: number | null = null;
  private statusInterval: number | null = null;
  private initRetryCount = 0;
  private maxRetries = 3;
  private saveInProgress = false; // Flag to prevent concurrent saves
  
  private state: BackgroundGenState = {
    isRunning: false,
    targetCount: 0,
    generatedCount: 0,
    startTime: null,
    speed: 0,
    progress: 0,
    lastUpdate: null,
    error: null,
    savedCount: 0 // Track how many are actually saved
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
      
      // Signal worker is ready
      this.isWorkerReady = true;
      
      // Set up more frequent saving of pending wallets
      this.saveInterval = window.setInterval(() => {
        this.savePendingWallets();
      }, 100); // More frequent saves
      
      // Set up periodic status updates
      this.statusInterval = window.setInterval(() => {
        if (this.isWorkerReady && this.worker && this.state.isRunning) {
          this.worker.postMessage({ action: 'status' });
        }
      }, 1000);
      
      console.log('Worker initialized successfully');
      
      // Send ready message to notify listeners
      this.updateState({
        error: null
      });
      
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
        console.log(`Received ${data.wallets?.length || 0} wallets from worker`);
        // Add new wallets to pending list
        if (data.wallets && Array.isArray(data.wallets)) {
          this.pendingWallets.push(...data.wallets);
          console.log(`Added to pending wallets. Total pending: ${this.pendingWallets.length}`);
        }
        
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
    if (this.pendingWallets.length === 0 || this.saveInProgress) return;
    
    this.saveInProgress = true;
    const walletsToSave = [...this.pendingWallets];
    this.pendingWallets = [];
    
    console.log(`Attempting to save ${walletsToSave.length} wallets to database`);
    
    try {
      // Use indexedDBStorage directly to avoid any transformation issues
      // Convert wallets to CompactWallet format
      const compactWallets = walletsToSave.map(wallet => ({
        a: wallet.address,
        p: wallet.privateKey,
        k: wallet.publicKey,
        t: wallet.type === 'TRC20' ? 0 : 1,
        c: wallet.createdAt.getTime()
      }));
      
      await indexedDBStorage.saveWallets(compactWallets);
      
      // Update the saved count
      this.updateState({
        savedCount: this.state.savedCount + walletsToSave.length,
        error: null
      });
      
      console.log(`Successfully saved ${walletsToSave.length} wallets to database. Total saved: ${this.state.savedCount}`);
    } catch (error) {
      console.error('Failed to save pending wallets:', error);
      // Put the wallets back in the queue
      this.pendingWallets = [...walletsToSave, ...this.pendingWallets];
      
      this.updateState({
        error: `保存钱包数据失败: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      this.saveInProgress = false;
      
      // If there are still pending wallets, schedule another save
      if (this.pendingWallets.length > 0) {
        setTimeout(() => this.savePendingWallets(), 100);
      }
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
    
    // Reset the state for new generation
    this.updateState({
      isRunning: true,
      targetCount: count,
      generatedCount: 0,
      savedCount: 0,
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
    
    // Save any remaining wallets
    this.savePendingWallets();
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
