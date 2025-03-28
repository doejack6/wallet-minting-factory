
/**
 * 哈希函数工具
 */
import * as CryptoJS from 'crypto-js';
import { hexToBytes } from './random';

// SHA256哈希函数
export function sha256(hexString: string): string {
  const wordArray = CryptoJS.enc.Hex.parse(hexString);
  const hash = CryptoJS.SHA256(wordArray);
  return hash.toString(CryptoJS.enc.Hex);
}

// SHA256哈希函数 (接受字节数组)
export function sha256Bytes(bytes: Uint8Array): Uint8Array {
  const wordArray = CryptoJS.lib.WordArray.create(bytes as any);
  const hash = CryptoJS.SHA256(wordArray);
  return hexToBytes(hash.toString(CryptoJS.enc.Hex));
}

// 对字符串进行SHA256哈希
export function sha256String(str: string): string {
  return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex);
}

// 双重SHA256哈希
export function doubleSha256(hexString: string): string {
  return sha256(sha256(hexString));
}

// Keccak256哈希函数(以太坊地址用)
export function keccak256(hexString: string): string {
  // 确保输入是有效的十六进制字符串
  if (hexString.startsWith('0x')) {
    hexString = hexString.slice(2);
  }
  
  const wordArray = CryptoJS.enc.Hex.parse(hexString);
  const hash = CryptoJS.SHA3(wordArray, { outputLength: 256 });
  return hash.toString(CryptoJS.enc.Hex);
}

// 对任意数据进行Keccak256哈希
export function keccak256Any(data: string | Uint8Array): string {
  let wordArray;
  
  if (typeof data === 'string') {
    // 确保字符串输入是正确的十六进制格式
    const hexString = data.startsWith('0x') ? data.slice(2) : data;
    wordArray = CryptoJS.enc.Hex.parse(hexString);
  } else {
    // 如果是字节数组，直接创建WordArray
    wordArray = CryptoJS.lib.WordArray.create(data as any);
  }
  
  const hash = CryptoJS.SHA3(wordArray, { outputLength: 256 });
  return hash.toString(CryptoJS.enc.Hex);
}

// 计算字节数组的双重SHA256哈希，返回字节数组
export function doubleHashBytes(bytes: Uint8Array): Uint8Array {
  const firstHash = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(bytes as any));
  const secondHash = CryptoJS.SHA256(firstHash);
  const hexStr = secondHash.toString(CryptoJS.enc.Hex);
  
  return hexToBytes(hexStr);
}

// 优化哈希计算的批处理方法
export function batchHash(inputs: string[], hashFunction: (input: string) => string): string[] {
  return inputs.map(hashFunction);
}
