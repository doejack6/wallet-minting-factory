
import { WalletType, Wallet } from '../types';
import { generateERC20Wallet } from '../wallets/erc20';
import { generateTRC20Wallet } from '../wallets/trc20';
import { generateRandomBytes } from '../crypto/random';

// Increased batch size and optimized generation
const BATCH_SIZE = 1000;
const MAX_GENERATION_SPEED = 10000; // Wallets per second

const determineWalletType = (types: WalletType[], trc20Ratio: number): WalletType => {
  if (types.length === 1) return types[0];
  
  const randomValue = generateRandomBytes(1)[0] / 255 * 100;
  return randomValue < trc20Ratio ? 'TRC20' : 'ERC20';
};

const generateWallet = (type: WalletType): Wallet => {
  const baseWallet = type === 'TRC20' 
    ? generateTRC20Wallet() 
    : generateERC20Wallet();

  return {
    id: crypto.randomUUID(),
    type,
    address: baseWallet.address,
    privateKey: baseWallet.privateKey,
    publicKey: baseWallet.publicKey,
    createdAt: new Date()
  };
};

const calculateSpeed = (startTime: number, generatedCount: number) => {
  const elapsedSeconds = (Date.now() - startTime) / 1000;
  return Math.min(
    MAX_GENERATION_SPEED, 
    Math.floor(generatedCount / (elapsedSeconds || 1))
  );
};

self.onmessage = (event) => {
  const { action, data } = event.data;

  switch (action) {
    case 'start':
      const { count, types, trc20Ratio } = data;
      generateWallets(count, types, trc20Ratio);
      break;
    case 'stop':
      // Implement graceful shutdown
      self.postMessage({ action: 'stopped' });
      break;
    case 'status':
      // Worker will respond to status requests
      self.postMessage({ 
        action: 'status', 
        data: { 
          // Return current status if available
          generatedCount: 0,
          progress: 0
        } 
      });
      break;
  }
};

const generateWallets = (count: number, types: WalletType[], trc20Ratio: number) => {
  const wallets: Wallet[] = [];
  const startTime = Date.now();
  let generatedCount = 0;

  try {
    for (let i = 0; i < count; i++) {
      const type = determineWalletType(types, trc20Ratio);
      const wallet = generateWallet(type);
      wallets.push(wallet);
      generatedCount++;

      if (wallets.length >= BATCH_SIZE || i === count - 1) {
        self.postMessage({ 
          action: 'wallets', 
          data: { 
            wallets: [...wallets], // Send a copy to avoid reference issues
            generatedCount: generatedCount,
            speed: calculateSpeed(startTime, generatedCount),
            isDone: i === count - 1
          } 
        });
        wallets.length = 0; // Clear the batch
      }
    }
  } catch (error) {
    console.error('Error generating wallets:', error);
    self.postMessage({ 
      action: 'error', 
      data: { message: error instanceof Error ? error.message : String(error) } 
    });
  }
};
