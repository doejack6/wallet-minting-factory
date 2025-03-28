
import { CompactWallet } from '../types';

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private dbName: string = 'WalletDatabase';
  private storeName: string = 'wallets';
  private dbVersion: number = 1;
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    this.initPromise = this.initDatabase();
  }
  
  public async initDatabase(): Promise<void> {
    if (this.db) return Promise.resolve();
    
    console.log('Initializing IndexedDB database...');
    
    return new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onupgradeneeded = (event) => {
          console.log('Database upgrade needed, creating object store');
          const db = request.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'a' });
            console.log('Created object store:', this.storeName);
          }
        };

        request.onsuccess = (event) => {
          this.db = request.result;
          console.log('IndexedDB connection established successfully');
          
          // Add event listeners for database errors
          this.db.onerror = (event) => {
            console.error('IndexedDB error:', event);
          };
          
          resolve();
        };

        request.onerror = (event) => {
          const error = request.error?.message || 'Unknown error';
          console.error('IndexedDB initialization error:', error);
          reject(new Error(`Failed to initialize IndexedDB: ${error}`));
        };
      } catch (error) {
        console.error('Exception during IndexedDB initialization:', error);
        reject(error);
      }
    });
  }
  
  public async ensureConnection(): Promise<void> {
    if (this.db) return Promise.resolve();
    return this.initPromise || this.initDatabase();
  }
  
  public async loadAllWallets(): Promise<CompactWallet[]> {
    await this.ensureConnection();
    
    if (!this.db) {
      console.error('Database not initialized after connection attempt');
      return [];
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          console.log(`Successfully loaded ${request.result?.length || 0} wallets from IndexedDB`);
          resolve(request.result || []);
        };

        request.onerror = (event) => {
          console.error('Failed to load wallets from IndexedDB', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Exception during loadAllWallets:', error);
        reject(error);
      }
    });
  }
  
  public async saveWallets(wallets: CompactWallet[]): Promise<void> {
    if (!wallets || wallets.length === 0) {
      console.log('No wallets to save to IndexedDB');
      return Promise.resolve();
    }
    
    await this.ensureConnection();
    
    if (!this.db) {
      console.error('Database not initialized after connection attempt');
      return Promise.reject(new Error('Database not initialized'));
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`Attempting to save ${wallets.length} wallets to IndexedDB`);
        
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        let completed = 0;
        
        transaction.oncomplete = () => {
          console.log(`Successfully saved all ${wallets.length} wallets to IndexedDB`);
          resolve();
        };
        
        transaction.onerror = (event) => {
          console.error('Error in transaction when saving wallets to IndexedDB', transaction.error);
          reject(transaction.error);
        };
        
        transaction.onabort = (event) => {
          console.error('Transaction aborted when saving wallets to IndexedDB', transaction.error);
          reject(transaction.error || new Error('Transaction aborted'));
        };
        
        wallets.forEach(wallet => {
          try {
            const request = store.put(wallet);
            
            request.onsuccess = () => {
              completed++;
              if (completed % 1000 === 0) {
                console.log(`Progress: ${completed}/${wallets.length} wallets saved`);
              }
            };
            
            request.onerror = (event) => {
              console.error('Error saving individual wallet', wallet.a, request.error);
            };
          } catch (error) {
            console.error('Exception while adding wallet to store:', error);
          }
        });
      } catch (error) {
        console.error('Exception during saveWallets:', error);
        reject(error);
      }
    });
  }
  
  public async clearAllWallets(): Promise<void> {
    await this.ensureConnection();
    
    if (!this.db) {
      console.error('Database not initialized after connection attempt');
      return Promise.reject(new Error('Database not initialized'));
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('Successfully cleared all wallets from IndexedDB');
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('Error clearing wallets from IndexedDB', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('Exception during clearAllWallets:', error);
        reject(error);
      }
    });
  }
}

// Create a singleton instance
export const indexedDBStorage = new IndexedDBStorage();
