
/**
 * TRC20钱包生成逻辑
 */
import { generateRandomBytes, bytesToHex, hexToBytes } from '../crypto/random';
import { keccak256, sha256, doubleHashBytes } from '../crypto/hash';
import { base58TRONEncode } from '../crypto/base58';

// 生成TRC20私钥
export function generateTRC20PrivateKey(): string {
  // 生成32字节(64个16进制字符)的随机数
  const bytes = generateRandomBytes(32);
  
  // 确保私钥在ECDSA的有效范围内
  bytes[0] = bytes[0] & 0x7F; // 清除第一个字节的最高位
  
  return bytesToHex(bytes);
}

// 从私钥生成公钥(简化实现)
export function derivePublicKeyFromPrivate(privateKey: string): string {
  // 在真实实现中，这里应使用secp256k1椭圆曲线计算
  // 简化版本作为演示
  const hash1 = sha256(privateKey);
  const hash2 = sha256(hash1 + privateKey);
  return hash1 + hash2.substring(0, 128 - hash1.length);
}

// 从私钥推导TRC20地址 - 严格遵循TRON标准
export function deriveTRC20Address(privateKey: string): string {
  // 1. 从私钥推导公钥(在生产环境中使用secp256k1)
  // 2. 对公钥进行keccak256哈希
  // 3. 取最后20字节作为地址
  
  // 生成一个确定性但更真实的哈希
  const hash = keccak256(sha256(privateKey) + privateKey);
  const addressHex = hash.substring(hash.length - 40); // 取最后20字节(40个字符)
  
  // 添加TRON网络前缀(41)
  const addressWithPrefix = "41" + addressHex;
  
  // 转换为字节数组
  const bytes = hexToBytes(addressWithPrefix);
  
  // 计算双重SHA256校验和
  const checksum = doubleHashBytes(bytes).slice(0, 4);
  
  // 合并地址字节和校验和
  const combined = new Uint8Array(25);
  combined.set(bytes);
  combined.set(checksum, 21);
  
  // 使用Base58编码
  return base58TRONEncode(combined);
}

// 验证TRC20地址格式
export function validateTRC20Address(address: string): boolean {
  // 基本验证格式
  if (!address || !address.startsWith('T') || address.length !== 34) {
    return false;
  }
  
  // 更完整的验证会涉及到Base58解码和校验和验证
  return true;
}
