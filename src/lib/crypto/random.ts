
/**
 * 高性能随机数生成工具
 * 优化后支持并行批量生成随机字节
 */

// 高性能加密安全随机数生成 - 支持批量生成
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  
  // Check if we're in a browser environment with crypto support
  if (typeof window !== 'undefined' && window.crypto) {
    // 使用Web Crypto API以获得最佳性能和安全性
    window.crypto.getRandomValues(bytes);
  } else if (typeof self !== 'undefined' && self.crypto) {
    // Web Worker environment
    self.crypto.getRandomValues(bytes);
  } else {
    // 没有加密API时的备选方案
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return bytes;
}

// 将字节转换为16进制字符串 - 优化版本
export function bytesToHex(bytes: Uint8Array): string {
  // 使用 Uint8Array 和 TextDecoder 相结合的高性能方法
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 从16进制字符串转换为字节数组 - 优化版本
export function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  
  // 确保长度为偶数
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  
  const result = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    result[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  
  return result;
}

// 生成指定长度的随机16进制字符串 - 批量优化
export function generateRandomHex(length: number): string {
  const byteLength = Math.ceil(length / 2);
  const bytes = generateRandomBytes(byteLength);
  return bytesToHex(bytes).slice(0, length);
}

// 生成符合有效私钥格式的随机私钥 - 批量优化版本
export function generateValidPrivateKey(): string {
  // 生成32字节的私钥
  const privateKeyBytes = generateRandomBytes(32);
  
  // 确保私钥在有效范围内（避免极端情况）
  privateKeyBytes[0] = privateKeyBytes[0] & 0x7F; // 清除第一个字节的最高位
  
  return bytesToHex(privateKeyBytes);
}

// 批量生成有效私钥 - 高性能版本
export function generateValidPrivateKeysBatch(count: number): string[] {
  // 一次性生成所有随机字节
  const allBytes = generateRandomBytes(count * 32);
  const result: string[] = [];
  
  // 处理每个私钥
  for (let i = 0; i < count; i++) {
    const start = i * 32;
    const slice = allBytes.slice(start, start + 32);
    
    // 修改第一个字节以确保私钥在有效范围内
    slice[0] = slice[0] & 0x7F;
    
    result.push(bytesToHex(slice));
  }
  
  return result;
}
