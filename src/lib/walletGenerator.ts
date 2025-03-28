
public autoConfigureForDevice(): GeneratorConfig {
  const newConfig = { ...this.config };
  
  // 优先使用全局服务器配置
  const serverCpuCores = window.SERVER_CPU_CORES ? Number(window.SERVER_CPU_CORES) : undefined;
  const serverMemoryMB = window.SERVER_MEMORY_MB ? Number(window.SERVER_MEMORY_MB) : undefined;
  
  const cores = serverCpuCores || navigator.hardwareConcurrency || 4;
  const memory = serverMemoryMB || Math.floor(navigator.deviceMemory || 4) * 1024;
  
  console.log(`自动配置检测到的环境参数：
    CPU核心数: ${cores}
    内存: ${memory}MB`);
  
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
  } else {
    newConfig.threadCount = 2;
    newConfig.batchSize = 200;
    newConfig.memoryLimit = Math.min(memory, 4096);
  }
  
  console.log(`自动配置结果:
    线程数: ${newConfig.threadCount}
    批处理大小: ${newConfig.batchSize}
    内存限制: ${newConfig.memoryLimit}MB`);
  
  this.setConfig(newConfig);
  return newConfig;
}
