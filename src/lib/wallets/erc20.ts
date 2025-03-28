
/**
 * ERC20钱包生成逻辑
 */
import { generateRandomBytes, bytesToHex } from '../crypto/random';
import { keccak256, sha256 } from '../crypto/hash';

// 生成ERC20私钥
export function generateERC20PrivateKey(): string {
  const bytes = generateRandomBytes(32);
  return bytesToHex(bytes);
}

// 从私钥推导公钥(简化实现)
export function derivePublicKeyFromPrivate(privateKey: string): string {
  // 简化版本作为演示
  const hash1 = sha256(privateKey);
  const hash2 = sha256(hash1 + privateKey);
  return hash1 + hash2.substring(0, 128 - hash1.length);
}

// 从私钥推导ERC20地址
export function deriveERC20Address(privateKey: string): string {
  // 在真实实现中:
  // 1. 使用secp256k1曲线从私钥推导公钥
  // 2. 计算公钥的keccak256哈希
  // 3. 取最后20字节(40个16进制字符)并添加0x前缀
  
  // 简化版本作为演示
  const hash = keccak256(privateKey);
  return '0x' + hash.substring(hash.length - 40);
}

// 验证ERC20地址格式
export function validateERC20Address(address: string): boolean {
  return address && 
         address.startsWith('0x') && 
         address.length === 42 && 
         /^0x[0-9a-fA-F]{40}$/.test(address);
}
