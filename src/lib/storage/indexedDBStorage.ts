
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
            const store = db.createObjectStore(this.storeName, { keyPath: 'a' });
            // Adding indexes to improve query performance
            store.createIndex('type', 't', { unique: false });
            store.createIndex('createdAt', 'c', { unique: false });
            console.log('Created object store with indexes:', this.storeName);
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
        
        // Split into smaller batches for large datasets to avoid transaction timeouts
        const batchSize = 1000;
        const batches = [];
        
        for (let i = 0; i < wallets.length; i += batchSize) {
          batches.push(wallets.slice(i, i + batchSize));
        }
        
        console.log(`Split into ${batches.length} batches of max ${batchSize} wallets each`);
        
        let completedBatches = 0;
        let totalSaved = 0;
        
        const processBatch = (batchIndex: number) => {
          if (batchIndex >= batches.length) {
            console.log(`All batches complete, saved ${totalSaved} wallets`);
            
            // Dispatch custom event when all batches complete
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('walletsStored', { 
                detail: { count: totalSaved, total: totalSaved }
              });
              window.dispatchEvent(event);
            }
            
            resolve();
            return;
          }
          
          const currentBatch = batches[batchIndex];
          console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${currentBatch.length} wallets`);
          
          const transaction = this.db!.transaction([this.storeName], 'readwrite');
          const store = transaction.objectStore(this.storeName);
          
          let batchCompleted = 0;
          
          transaction.oncomplete = () => {
            completedBatches++;
            totalSaved += currentBatch.length;
            console.log(`Batch ${batchIndex + 1} complete. Saved ${currentBatch.length} wallets. Total: ${totalSaved}`);
            
            // Process next batch after a small delay to allow UI updates
            setTimeout(() => processBatch(batchIndex + 1), 10);
          };
          
          transaction.onerror = (event) => {
            console.error(`Error in batch ${batchIndex + 1}:`, transaction.error);
            
            // Try to continue with the next batch despite error
            setTimeout(() => processBatch(batchIndex + 1), 100);
          };
          
          // Add all wallets in the batch to the store
          currentBatch.forEach(wallet => {
            try {
              const request = store.put(wallet);
              
              request.onsuccess = () => {
                batchCompleted++;
                if (batchCompleted % 100 === 0) {
                  console.log(`Progress: ${batchCompleted}/${currentBatch.length} in batch ${batchIndex + 1}`);
                }
              };
              
              request.onerror = (event) => {
                console.error(`Error saving wallet ${wallet.a}:`, request.error);
              };
            } catch (error) {
              console.error('Exception while adding wallet to store:', error);
            }
          });
        };
        
        // Start processing the first batch
        processBatch(0);
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
