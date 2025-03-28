
// This file contains the Web Worker logic for wallet generation

import { generateWallet } from '../walletGenerator';
import { Wallet, WalletType } from '../types';

// Context for the Web Worker
const ctx: Worker = self as any;

let isRunning = false;
let generatedCount = 0;
let targetCount = 0;
let lastReportTime = 0;
let walletBatch: Wallet[] = [];
const batchSize = 100; // Size of batches to send back to main thread

// Web Worker message handler
ctx.addEventListener('message', (event) => {
  const { action, data } = event.data;
  
  switch (action) {
    case 'start':
      targetCount = data.count;
      isRunning = true;
      startGeneration(data.types, data.trc20Ratio);
      break;
    case 'stop':
      isRunning = false;
      // Send any remaining wallets
      if (walletBatch.length > 0) {
        ctx.postMessage({ action: 'wallets', data: { wallets: walletBatch, isDone: true } });
        walletBatch = [];
      }
      ctx.postMessage({ action: 'stopped', data: { generatedCount } });
      break;
    case 'status':
      ctx.postMessage({ 
        action: 'status', 
        data: { 
          isRunning, 
          generatedCount, 
          targetCount,
          progress: targetCount > 0 ? Math.min(100, (generatedCount / targetCount) * 100) : 0
        } 
      });
      break;
    default:
      console.error('Unknown action:', action);
  }
});

function startGeneration(walletTypes: WalletType[], trc20Ratio: number) {
  generatedCount = 0;
  walletBatch = [];
  lastReportTime = Date.now();
  
  // Use setTimeout instead of requestAnimationFrame for better performance in background
  function generateBatch() {
    if (!isRunning) return;
    
    const batchStartTime = performance.now();
    const typesCount = walletTypes.length;
    
    // Generate the maximum batch we can in a reasonable time (10ms)
    let batchCount = 0;
    const maxBatchTime = 10; // ms
    
    while (performance.now() - batchStartTime < maxBatchTime && 
           (targetCount === 0 || generatedCount < targetCount)) {
      
      let type: WalletType;
      
      // Determine which type to generate based on ratio
      if (typesCount === 1) {
        type = walletTypes[0];
      } else {
        // Use weighted random selection based on trc20Ratio
        type = (Math.random() * 100 < trc20Ratio) ? 'TRC20' : 'ERC20';
      }
      
      const wallet = generateWallet(type);
      walletBatch.push(wallet);
      generatedCount++;
      batchCount++;
      
      // If we've reached the batch size or target count, send the batch
      if (walletBatch.length >= batchSize || 
          (targetCount > 0 && generatedCount >= targetCount)) {
        break;
      }
    }
    
    // Report progress every 500ms or when the batch is full
    const now = Date.now();
    if (walletBatch.length >= batchSize || now - lastReportTime > 500) {
      const isDone = targetCount > 0 && generatedCount >= targetCount;
      
      // Send the batch to the main thread
      if (walletBatch.length > 0) {
        ctx.postMessage({ 
          action: 'wallets', 
          data: { 
            wallets: walletBatch, 
            generatedCount,
            speed: Math.round(batchCount / ((performance.now() - batchStartTime) / 1000)),
            isDone 
          } 
        });
        
        // Clear the batch after sending
        walletBatch = [];
        lastReportTime = now;
      }
      
      // Stop if we've reached the target
      if (isDone) {
        isRunning = false;
        ctx.postMessage({ action: 'completed', data: { generatedCount } });
        return;
      }
    }
    
    // Continue generating in the next tick
    setTimeout(generateBatch, 0);
  }
  
  // Start the generation process
  generateBatch();
}

// Report that the worker is ready
ctx.postMessage({ action: 'ready' });
