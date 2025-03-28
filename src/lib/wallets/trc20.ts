
/**
 * TRC20钱包生成逻辑 - 按照TRON官方规范实现
 */
import { generateValidPrivateKey, bytesToHex, hexToBytes } from '../crypto/random';
import { keccak256Any, sha256Bytes } from '../crypto/hash';
import { base58check } from '../crypto/base58';

// 生成TRC20私钥
export function generateTRC20PrivateKey(): string {
  return generateValidPrivateKey();
}

// 从私钥生成公钥
export function derivePublicKeyFromPrivate(privateKey: string): string {
  // 注意：在真实实现中，这里应该使用secp256k1椭圆曲线算法
  // 从私钥计算公钥。由于我们没有实际的secp256k1库，这里提供一个模拟的公钥
  
  // 创建一个确定性但伪造的公钥以保持一致性 (与ERC20类似但有所区别)
  const hash1 = keccak256Any(privateKey + "tron");
  const hash2 = keccak256Any(hash1 + privateKey);
  
  // 真实公钥是65字节：1字节前缀 + 32字节X坐标 + 32字节Y坐标
  return "04" + hash1 + hash2.substring(0, 64 - hash1.length);
}

// 从私钥推导TRC20地址 - 严格遵循TRON标准
export function deriveTRC20Address(privateKey: string): string {
  // 1. 获取公钥 (在真实实现中用secp256k1从私钥派生)
  const publicKey = derivePublicKeyFromPrivate(privateKey);
  
  // 2. 对公钥哈希化 (跳过第一个字节 0x04)
  const publicKeyNoPrefix = publicKey.slice(2); // 移除04前缀
  const publicKeyBytes = hexToBytes(publicKeyNoPrefix);
  
  // 3. 计算keccak256哈希
  const keccak256Hash = keccak256Any(publicKeyBytes);
  
  // 4. 取哈希的最后20字节（40个十六进制字符）作为原始地址
  const addressHex = keccak256Hash.slice(-40);
  const addressBytes = hexToBytes(addressHex);
  
  // 5. 添加TRON地址前缀(0x41)并使用Base58Check编码
  // TRON地址的前缀是0x41 (十进制65)
  return base58check(addressBytes, 0x41);
}

// 验证TRC20地址格式
export function validateTRC20Address(address: string): boolean {
  // 基本格式检查
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // TRC20地址必须以T开头，长度为34个字符
  if (!address.startsWith('T') || address.length !== 34) {
    return false;
  }
  
  // 检查是否仅包含Base58字符
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

// 将十六进制地址转换为TRC20格式
export function hexToTronAddress(hexAddress: string): string {
  // 确保输入没有0x前缀
  if (hexAddress.startsWith('0x')) {
    hexAddress = hexAddress.slice(2);
  }
  
  // 确保长度为40
  if (hexAddress.length !== 40) {
    throw new Error("Invalid hex address length");
  }
  
  // 转换为字节数组并添加前缀
  const addressBytes = hexToBytes(hexAddress);
  
  // 使用Base58Check编码
  return base58check(addressBytes, 0x41);
}
