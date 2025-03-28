
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
  let result = "";
  
  // 使用BigInt处理大数
  let intValue = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    intValue = intValue * BigInt(256) + BigInt(bytes[i]);
  }
  
  while (intValue > BigInt(0)) {
    const remainder = Number(intValue % BigInt(58));
    intValue = intValue / BigInt(58);
    result = BASE58_CHARS[remainder] + result;
  }
  
  // 前导零变成'1'
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    result = '1' + result;
  }
  
  return result;
}
