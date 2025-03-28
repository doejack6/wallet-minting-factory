
/**
 * Base58编码工具
 */

// Base58字符集
export const BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// 基本的Base58编码
export function base58Encode(data: Uint8Array): string {
  let result = "";
  let value = 0;
  let j = 0;
  
  for (let i = 0; i < data.length; i++) {
    for (let x = 0; x < 8; x++) {
      value = ((value << 1) | ((data[i] >> (7 - x)) & 1));
      j++;
      if (j % 6 === 0) {
        result += BASE58_CHARS[value];
        value = 0;
      }
    }
  }
  
  if (j % 6 !== 0) {
    value <<= (6 - (j % 6));
    result += BASE58_CHARS[value];
  }
  
  return result;
}

// TRON专用的Base58编码(处理大数字)
export function base58TRONEncode(bytes: Uint8Array): string {
  if (bytes.length === 0) {
    return "";
  }

  // 计算前导零的数量
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) {
    zeros++;
  }

  // 复制一份输入数据用于转换
  const input = Array.from(bytes);
  
  // 结果数组，预分配足够大的空间
  const result = new Array(input.length * 2);
  let resultLen = 0;

  for (let i = 0; i < input.length; i++) {
    let carry = input[i];
    let j = 0;
    
    // 对结果中的每个数字应用"基础乘法"并加上进位值
    for (let k = result.length - 1; k >= 0 || carry; k--) {
      if (k < 0) {
        result.unshift(0);
        k = 0;
        resultLen++;
      }
      
      carry += 256 * (result[k] || 0);
      result[k] = carry % 58;
      carry = Math.floor(carry / 58);
      j++;
    }
  }

  // 跳过结果开头的零（但不是因为输入中前导零而产生的零）
  let i = 0;
  while (i < resultLen && result[i] === 0) {
    i++;
  }

  // 转换成Base58字符
  let str = '';
  
  // 前导零对应的'1'字符
  for (let j = 0; j < zeros; j++) {
    str += '1';
  }
  
  // 转换其余部分
  for (; i < resultLen; i++) {
    str += BASE58_CHARS[result[i]];
  }
  
  return str;
}

// Base58检查和编码（TRON地址专用）
export function base58check(payload: Uint8Array, version: number = 0x41): string {
  // 准备带版本的载荷
  const extendedPayload = new Uint8Array(payload.length + 1);
  extendedPayload[0] = version;
  extendedPayload.set(payload, 1);
  
  // 计算校验和
  const checksum = doubleHashChecksum(extendedPayload);
  
  // 组合最终数据
  const finalData = new Uint8Array(extendedPayload.length + 4);
  finalData.set(extendedPayload);
  finalData.set(checksum, extendedPayload.length);
  
  // 进行Base58编码
  return base58TRONEncode(finalData);
}

// 辅助函数：计算双重SHA256校验和（取前4字节）
function doubleHashChecksum(data: Uint8Array): Uint8Array {
  const hash1 = CryptoJS.SHA256(CryptoJS.lib.WordArray.create(data as any));
  const hash2 = CryptoJS.SHA256(hash1);
  const hashHex = hash2.toString(CryptoJS.enc.Hex);
  return new Uint8Array([
    parseInt(hashHex.substr(0, 2), 16),
    parseInt(hashHex.substr(2, 2), 16),
    parseInt(hashHex.substr(4, 2), 16),
    parseInt(hashHex.substr(6, 2), 16)
  ]);
}

// 导入辅助函数
import * as CryptoJS from 'crypto-js';
