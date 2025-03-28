
/**
 * Base58编码工具 - 修复版
 */
import * as CryptoJS from 'crypto-js';

// Base58字符集 (比特币和TRON使用的标准字符集)
export const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// 基本的Base58编码 (大整数处理版本)
export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return "";
  
  // 计算前导零的数量
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }
  
  // 复制输入数据进行转换
  const data = Array.from(bytes);
  
  // 创建足够大的结果数组
  const result = [];
  
  // 为结果分配足够的空间
  for (let i = 0; i < data.length * 2; i++) {
    result.push(0);
  }
  
  let resultSize = 0;
  
  // 转换为Base58
  for (let i = 0; i < data.length; i++) {
    let carry = data[i];
    let j = 0;
    
    // 对现有结果应用"基数乘法"并添加进位
    for (let k = 0; k < resultSize || carry; k++, j++) {
      if (k >= resultSize) {
        result[k] = 0;
        resultSize++;
      }
      carry += result[k] * 256;
      result[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
  }
  
  // 跳过结果数组中的尾随零（除了表示输入中前导零）
  let resultStr = '';
  
  // 添加与输入中的前导零对应的前导'1'
  for (let i = 0; i < zeros; i++) {
    resultStr += '1';
  }
  
  // 从结果数组中构建Base58字符串（倒序）
  for (let i = resultSize - 1; i >= 0; i--) {
    resultStr += BASE58_CHARS[result[i]];
  }
  
  return resultStr;
}

// Base58Check编码 (TRON地址专用)
export function base58check(payload: Uint8Array, version: number = 0x41): string {
  // 准备带版本的载荷
  const versionedPayload = new Uint8Array(payload.length + 1);
  versionedPayload[0] = version;
  versionedPayload.set(payload, 1);
  
  // 计算双重SHA256校验和
  const checksum = doubleHashChecksum(versionedPayload);
  
  // 组合最终数据 (版本+载荷+校验和)
  const finalData = new Uint8Array(versionedPayload.length + 4);
  finalData.set(versionedPayload);
  finalData.set(checksum, versionedPayload.length);
  
  // 进行Base58编码
  return base58Encode(finalData);
}

// 计算双重SHA256校验和 (取前4字节)
function doubleHashChecksum(data: Uint8Array): Uint8Array {
  const hash1 = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(data as any));
  const hash2 = CryptoJS.SHA256(hash1);
  const hashHex = hash2.toString(CryptoJS.enc.Hex);
  
  // 取双重哈希的前4字节作为校验和
  return new Uint8Array([
    parseInt(hashHex.substring(0, 2), 16),
    parseInt(hashHex.substring(2, 4), 16),
    parseInt(hashHex.substring(4, 6), 16),
    parseInt(hashHex.substring(6, 8), 16)
  ]);
}
