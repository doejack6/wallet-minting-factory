import { generateTRC20Wallet } from '../wallets/trc20';
import { generateERC20Wallet } from '../wallets/erc20';
import { v4 as uuidv4 } from 'uuid';
import { Wallet, WalletType } from '../types';

// Worker context (self) type definition
declare const self: DedicatedWorkerGlobalScope;

// State variables
let isRunning = false;
let targetCount = 0;
let generatedCount = 0;
let startTime: Date | null = null;
let lastBatchTime: Date | null = null;
let walletTypes: WalletType[] = ['TRC20', 'ERC20'];
let trc20Ratio = 50;
let batchSize = 100;

// Notify that the worker is ready
self.postMessage({ action: 'ready' });

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { action, data } = event.data;
  
  try {
    switch (action) {
      case 'start':
        startGeneration(data.count, data.types, data.trc20Ratio);
        break;
        
      case 'stop':
        stopGeneration();
        break;
        
      case 'status':
        sendStatus();
        break;
        
      default:
        self.postMessage({ 
          action: 'error', 
          data: { message: `未知操作: ${action}` } 
        });
    }
  } catch (error) {
    console.error('Worker error handling message:', error);
    self.postMessage({ 
      action: 'error', 
      data: { message: `工作线程错误: ${error instanceof Error ? error.message : String(error)}` } 
    });
  }
});

// Start wallet generation
function startGeneration(count: number, types: WalletType[], ratio: number) {
  if (isRunning) {
    self.postMessage({ 
      action: 'error', 
      data: { message: '生成器已在运行中' } 
    });
    return;
  }
  
  isRunning = true;
  targetCount = count;
  generatedCount = 0;
  startTime = new Date();
  walletTypes = types || ['TRC20', 'ERC20'];
  trc20Ratio = ratio !== undefined ? ratio : 50;
  
  console.log(`Worker starting generation of ${count} wallets with types:`, walletTypes, `ratio: ${trc20Ratio}%`);
  
  // Begin generation process
  generateBatch();
}

// Stop wallet generation
function stopGeneration() {
  if (!isRunning) return;
  
  isRunning = false;
  self.postMessage({ action: 'stopped' });
}

// Generate a batch of wallets
function generateBatch() {
  if (!isRunning) return;
  
  const currentBatchTime = new Date();
  lastBatchTime = lastBatchTime || currentBatchTime;
  
  try {
    // Calculate how many to generate in this batch
    const remaining = targetCount - generatedCount;
    const currentBatchSize = Math.min(batchSize, remaining);
    
    if (currentBatchSize <= 0) {
      // Generation complete
      isRunning = false;
      self.postMessage({ 
        action: 'completed', 
        data: { 
          generatedCount: generatedCount,
          isDone: true
        } 
      });
      return;
    }
    
    // Generate wallets
    const wallets: Wallet[] = [];
    
    for (let i = 0; i < currentBatchSize; i++) {
      // Determine wallet type for this iteration
      const walletType = determineWalletType();
      let wallet: Wallet;
      
      try {
        if (walletType === 'TRC20') {
          const trcWallet = generateTRC20Wallet();
          wallet = {
            id: uuidv4(),
            type: 'TRC20',
            address: trcWallet.address,
            privateKey: trcWallet.privateKey,
            publicKey: trcWallet.publicKey || '',
            createdAt: new Date()
          };
        } else {
          const ercWallet = generateERC20Wallet();
          wallet = {
            id: uuidv4(),
            type: 'ERC20',
            address: ercWallet.address,
            privateKey: ercWallet.privateKey,
            publicKey: ercWallet.publicKey || '',
            createdAt: new Date()
          };
        }
        
        wallets.push(wallet);
        generatedCount++;
      } catch (error) {
        console.error(`Error generating ${walletType} wallet:`, error);
      }
    }
    
    // Calculate speed
    const timeDiff = (new Date().getTime() - currentBatchTime.getTime()) / 1000;
    const speed = timeDiff > 0 ? Math.round(currentBatchSize / timeDiff) : 0;
    
    // Send wallets and status to main thread
    self.postMessage({
      action: 'wallets',
      data: {
        wallets,
        generatedCount,
        progress: (generatedCount / targetCount) * 100,
        speed,
        isDone: generatedCount >= targetCount
      }
    });
    
    // Schedule next batch if not done
    if (isRunning && generatedCount < targetCount) {
      setTimeout(generateBatch, 0);
    } else if (generatedCount >= targetCount) {
      isRunning = false;
      self.postMessage({ 
        action: 'completed', 
        data: { 
          generatedCount: generatedCount 
        } 
      });
    }
  } catch (error) {
    console.error('Error in batch generation:', error);
    self.postMessage({ 
      action: 'error', 
      data: { message: `生成钱包过程中出错: ${error instanceof Error ? error.message : String(error)}` } 
    });
  }
}

// Determine which wallet type to generate based on ratio
function determineWalletType(): WalletType {
  // If only one type is available, use that
  if (walletTypes.length === 1) {
    return walletTypes[0];
  }
  
  // Otherwise use ratio to determine type
  const random = Math.random() * 100;
  return random < trc20Ratio ? 'TRC20' : 'ERC20';
}

// Send current status to main thread
function sendStatus() {
  self.postMessage({
    action: 'status',
    data: {
      generatedCount,
      progress: targetCount > 0 ? (generatedCount / targetCount) * 100 : 0
    }
  });
}

// Handle errors
self.addEventListener('error', (event) => {
  console.error('Worker global error:', event);
  self.postMessage({ 
    action: 'error', 
    data: { message: `工作线程全局错误: ${event.message}` } 
  });
});
