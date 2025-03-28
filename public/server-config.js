
// 服务器配置信息
// Using a safer way to check for and set global variables
(function() {
  // Safely detect environment
  const isWorker = typeof self !== 'undefined' && typeof window === 'undefined';
  const isBrowser = typeof window !== 'undefined';
  
  // Set globals only in browser environment
  if (isBrowser) {
    window.SERVER_CPU_CORES = window.SERVER_CPU_CORES || '16';
    window.SERVER_MEMORY_MB = window.SERVER_MEMORY_MB || '32768';
    
    // 检查Web Worker API是否可用
    window.isWorkerSupported = typeof Worker !== 'undefined';
    if (!window.isWorkerSupported) {
      console.error('当前浏览器不支持Web Worker API，钱包生成功能将无法正常工作！');
    }
    
    // 检查IndexedDB API是否可用
    window.isIndexedDBSupported = typeof window.indexedDB !== 'undefined';
    if (!window.isIndexedDBSupported) {
      console.error('当前浏览器不支持IndexedDB API，钱包存储功能将无法正常工作！');
    }
    
    // 记录配置信息
    console.log('服务器配置加载完成:', {
      CPU核心数: window.SERVER_CPU_CORES,
      内存容量: window.SERVER_MEMORY_MB + 'MB',
      是否支持Web Worker: window.isWorkerSupported,
      是否支持IndexedDB: window.isIndexedDBSupported
    });
    
    // 通知应用服务器配置已准备就绪
    document.dispatchEvent(new Event('server-config-ready'));
  }
  
  // For worker environment, set up minimal required globals
  if (isWorker) {
    // Set up defaults for worker environment
    self.SERVER_CPU_CORES = '16';
    self.SERVER_MEMORY_MB = '32768';
  }
})();
