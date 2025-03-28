
import { CompactWallet } from '../types';

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private dbName: string = 'WalletDatabase';
  private storeName: string = 'wallets';
  private dbVersion: number = 1;
  
  constructor() {
    this.initDatabase();
  }
  
  public async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'a' });
        }
      };

      request.onsuccess = (event) => {
        this.db = request.result;
        console.log('IndexedDB connection established');
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB initialization error', event);
        reject(event);
      };
    });
  }
  
  public async loadAllWallets(): Promise<CompactWallet[]> {
    if (!this.db) {
      console.warn('Database not initialized, trying to initialize...');
      await this.initDatabase();
      if (!this.db) {
        console.error('Failed to initialize database');
        return [];
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = (event) => {
        console.error('Failed to load wallets from IndexedDB', event);
        reject(event);
      };
    });
  }
  
  public async saveWallets(wallets: CompactWallet[]): Promise<void> {
    if (!this.db || wallets.length === 0) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      let completed = 0;
      let failed = false;
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error('Error saving wallets to IndexedDB', event);
        failed = true;
        reject(event);
      };
      
      wallets.forEach(wallet => {
        const request = store.put(wallet);
        
        request.onsuccess = () => {
          completed++;
          if (completed === wallets.length && !failed) {
            // All wallets have been processed
            console.log(`Successfully saved ${completed} wallets to IndexedDB`);
          }
        };
        
        request.onerror = (event) => {
          console.error('Error saving wallet', wallet.a, event);
        };
      });
    });
  }
  
  public async clearAllWallets(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('Successfully cleared all wallets from IndexedDB');
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error clearing wallets from IndexedDB', event);
        reject(event);
      };
    });
  }
}

// Create a singleton instance
export const indexedDBStorage = new IndexedDBStorage();
