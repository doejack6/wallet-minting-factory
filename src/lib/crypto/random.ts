
/**
 * 随机数生成工具
 */

// 增强的加密安全随机数生成
export function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // 没有加密API时的备选方案
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return bytes;
}

// 将字节转换为16进制字符串
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 从16进制字符串转换为字节数组
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// 生成指定长度的随机16进制字符串
export function generateRandomHex(length: number): string {
  const byteLength = Math.ceil(length / 2);
  const bytes = generateRandomBytes(byteLength);
  return bytesToHex(bytes).slice(0, length);
}
