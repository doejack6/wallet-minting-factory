
// Worker script for wallet generation
import { generateERC20Wallet } from '../wallets/erc20';
import { generateTRC20Wallet } from '../wallets/trc20';
import { WalletType, Wallet } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Make sure to define that we're in a worker context
declare const self: Worker;

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  try {
    const { type, count } = event.data;
    
    if (count > 0) {
      // Batch generation
      const wallets = generateWalletsBatch(type, count);
      self.postMessage({ wallets });
    } else {
      // Single wallet generation
      const wallet = generateWallet(type);
      self.postMessage({ wallet });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ error: error.message || 'Unknown error in worker' });
  }
});

// Generate a batch of wallets
function generateWalletsBatch(type: WalletType, count: number): Wallet[] {
  const wallets: Wallet[] = [];
  for (let i = 0; i < count; i++) {
    const wallet = generateWallet(type);
    if (wallet) wallets.push(wallet);
  }
  return wallets;
}

// Generate a single wallet
function generateWallet(type: WalletType): Wallet {
  let wallet: Wallet;
  
  if (type === 'TRC20') {
    const trc20Wallet = generateTRC20Wallet();
    wallet = {
      id: uuidv4(),
      type: 'TRC20',
      address: trc20Wallet.address,
      privateKey: trc20Wallet.privateKey,
      publicKey: trc20Wallet.publicKey,
      createdAt: new Date(),
    };
  } else {
    const erc20Wallet = generateERC20Wallet();
    wallet = {
      id: uuidv4(),
      type: 'ERC20',
      address: erc20Wallet.address,
      privateKey: erc20Wallet.privateKey,
      publicKey: erc20Wallet.publicKey,
      createdAt: new Date(),
    };
  }
  
  return wallet;
}
