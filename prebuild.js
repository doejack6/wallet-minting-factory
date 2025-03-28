
/**
 * 构建前检查环境变量
 */

console.log('正在检查环境变量...');

// 检查环境变量
const serverCpuCores = process.env.SERVER_CPU_CORES || '';
const serverMemoryMB = process.env.SERVER_MEMORY_MB || '';

console.log('服务器配置:', {
  SERVER_CPU_CORES: serverCpuCores || '未设置 (将使用默认值:16)',
  SERVER_MEMORY_MB: serverMemoryMB || '未设置 (将使用默认值:32768)',
});

// 验证服务器核心数
if (serverCpuCores) {
  const cores = parseInt(serverCpuCores, 10);
  if (isNaN(cores) || cores <= 0) {
    console.warn('⚠️ SERVER_CPU_CORES 环境变量不是有效数字，将使用默认值(16)');
  } else {
    console.log(`✅ 服务器CPU核心数: ${cores}`);
  }
}

// 验证服务器内存
if (serverMemoryMB) {
  const memory = parseInt(serverMemoryMB, 10);
  if (isNaN(memory) || memory <= 0) {
    console.warn('⚠️ SERVER_MEMORY_MB 环境变量不是有效数字，将使用默认值(32768)');
  } else {
    console.log(`✅ 服务器内存: ${memory}MB`);
  }
}

console.log('环境变量检查完成，开始构建...');
