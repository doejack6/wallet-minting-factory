
import { CompactWallet } from '../types';

class IndexedDBStorage {
  private db: IDBDatabase | null = null;
  private dbName: string = 'WalletDatabase';
  private storeName: string = 'wallets';
  private dbVersion: number = 1;
  private initPromise: Promise<void> | null = null;
  private initInProgress: boolean = false;
  private pendingOperations: Array<() => Promise<void>> = [];
  private processingQueue: boolean = false;
  
  constructor() {
    this.initPromise = this.initDatabase();
  }
  
  public async initDatabase(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.initInProgress) {
      return this.initPromise || Promise.reject(new Error('Initialization already in progress but no promise found'));
    }
    
    this.initInProgress = true;
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
          this.initInProgress = false;
          console.log('IndexedDB connection established successfully');
          
          // Add event listeners for database errors
          this.db.onerror = (event) => {
            console.error('IndexedDB error:', event);
          };
          
          // Process any pending operations
          this.processPendingOperations();
          
          resolve();
        };

        request.onerror = (event) => {
          this.initInProgress = false;
          const error = request.error?.message || 'Unknown error';
          console.error('IndexedDB initialization error:', error);
          reject(new Error(`Failed to initialize IndexedDB: ${error}`));
        };
      } catch (error) {
        this.initInProgress = false;
        console.error('Exception during IndexedDB initialization:', error);
        reject(error);
      }
    });
  }
  
  private async processPendingOperations() {
    if (this.processingQueue || this.pendingOperations.length === 0) return;
    this.processingQueue = true;
    
    console.log(`Processing ${this.pendingOperations.length} pending IndexedDB operations`);
    
    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Error executing pending operation:', error);
        }
      }
    }
    
    this.processingQueue = false;
    console.log('Finished processing pending IndexedDB operations');
  }
  
  public async ensureConnection(): Promise<void> {
    if (this.db) return Promise.resolve();
    if (this.initPromise) {
      return this.initPromise.then(() => {
        if (!this.db) {
          console.error('Database still not initialized after initialization promise resolved');
          return this.initDatabase();
        }
      }).catch(error => {
        console.error('Error waiting for initialization:', error);
        return this.initDatabase();
      });
    }
    return this.initDatabase();
  }
  
  public async loadAllWallets(): Promise<CompactWallet[]> {
    if (!this.db) {
      await this.ensureConnection();
      
      if (!this.db) {
        console.error('Database not initialized after connection attempt');
        return [];
      }
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
    
    if (!this.db) {
      console.log('Database not ready, queueing saveWallets operation');
      
      return new Promise((resolve, reject) => {
        const operation = async () => {
          try {
            await this.saveWalletsInternal(wallets);
            resolve();
          } catch (error) {
            reject(error);
          }
        };
        
        this.pendingOperations.push(operation);
        
        this.ensureConnection()
          .then(() => this.processPendingOperations())
          .catch(error => {
            console.error('Failed to ensure connection for pending operation:', error);
            reject(error);
          });
      });
    }
    
    return this.saveWalletsInternal(wallets);
  }
  
  private async saveWalletsInternal(wallets: CompactWallet[]): Promise<void> {
    if (!this.db) {
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
          
          // Dispatch a custom event to notify components about wallet storage
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('walletsStored', { 
              detail: { count: wallets.length, total: completed } 
            });
            window.dispatchEvent(event);
          }
          
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
    if (!this.db) {
      await this.ensureConnection();
      
      if (!this.db) {
        console.error('Database not initialized after connection attempt');
        return Promise.reject(new Error('Database not initialized'));
      }
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('Successfully cleared all wallets from IndexedDB');
          
          // Dispatch a custom event to notify components
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('databaseCleared');
            window.dispatchEvent(event);
          }
          
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
  
  // Check if database is ready
  public isDatabaseReady(): boolean {
    return this.db !== null;
  }
  
  // Get queue status
  public getQueueStatus(): { pending: number, processing: boolean } {
    return {
      pending: this.pendingOperations.length,
      processing: this.processingQueue
    };
  }
}

// Create a singleton instance
export const indexedDBStorage = new IndexedDBStorage();
