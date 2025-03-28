
public autoConfigureForDevice(): GeneratorConfig {
  const newConfig = { ...this.config };
  
  // 优先使用全局服务器配置（从 window 对象获取）
  const serverCpuCores = window.SERVER_CPU_CORES ? Number(window.SERVER_CPU_CORES) : undefined;
  const serverMemoryMB = window.SERVER_MEMORY_MB ? Number(window.SERVER_MEMORY_MB) : undefined;
  
  // 获取设备信息（服务器配置或浏览器能力）
  const cores = serverCpuCores || navigator.hardwareConcurrency || 4;
  const memory = serverMemoryMB || (navigator.deviceMemory ? Math.floor(navigator.deviceMemory) * 1024 : 4096);
  
  console.log(`系统检测到的环境参数:
    CPU核心数: ${cores} ${serverCpuCores ? '(来自服务器配置)' : '(来自浏览器)'}
    内存: ${memory}MB ${serverMemoryMB ? '(来自服务器配置)' : '(来自浏览器)'}`);
  
  // 根据CPU核心数智能调整配置
  if (cores >= 32) {
    newConfig.threadCount = 16;
    newConfig.batchSize = 2000;
    newConfig.memoryLimit = Math.min(memory, 32768);
  } else if (cores >= 16) {
    newConfig.threadCount = 8;
    newConfig.batchSize = 1000;
    newConfig.memoryLimit = Math.min(memory, 16384);
  } else if (cores >= 8) {
    newConfig.threadCount = 4;
    newConfig.batchSize = 500;
    newConfig.memoryLimit = Math.min(memory, 8192);
  } else if (cores >= 4) {
    newConfig.threadCount = 2;
    newConfig.batchSize = 300;
    newConfig.memoryLimit = Math.min(memory, 4096);
  } else {
    // 低端设备配置
    newConfig.threadCount = 1;
    newConfig.batchSize = 200;
    newConfig.memoryLimit = Math.min(memory, 2048);
  }
  
  // 根据可用内存进一步调整批处理大小
  if (memory >= 32768) { // 32GB+
    newConfig.batchSize = Math.max(newConfig.batchSize, 2000);
  } else if (memory >= 16384) { // 16GB+
    newConfig.batchSize = Math.max(newConfig.batchSize, 1000);
  } else if (memory >= 8192) { // 8GB+
    newConfig.batchSize = Math.max(newConfig.batchSize, 500);
  } else if (memory < 2048) { // 低于2GB
    newConfig.batchSize = Math.min(newConfig.batchSize, 100);
    newConfig.threadCount = 1; // 低内存设备限制为单线程
  }
  
  console.log(`自动配置结果:
    线程数: ${newConfig.threadCount}
    批处理大小: ${newConfig.batchSize}
    内存限制: ${newConfig.memoryLimit}MB`);
  
  this.setConfig(newConfig);
  return newConfig;
}
