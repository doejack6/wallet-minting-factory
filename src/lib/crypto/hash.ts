
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

// 双重SHA256哈希
export function doubleSha256(hexString: string): string {
  return sha256(sha256(hexString));
}

// Keccak256哈希函数(以太坊地址用)
export function keccak256(hexString: string): string {
  const wordArray = CryptoJS.enc.Hex.parse(hexString);
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
