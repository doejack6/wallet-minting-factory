
/**
 * ERC20钱包生成逻辑 - 按照以太坊官方标准
 */
import { generateValidPrivateKey, bytesToHex, hexToBytes } from '../crypto/random';
import { keccak256Any } from '../crypto/hash';
import * as CryptoJS from 'crypto-js';
import { ec as EC } from 'elliptic';

// 使用elliptic库进行椭圆曲线计算
const ec = new EC('secp256k1');

// 生成ERC20私钥
export function generateERC20PrivateKey(): string {
  return generateValidPrivateKey();
}

// 从私钥推导公钥 (使用secp256k1椭圆曲线)
export function derivePublicKeyFromPrivate(privateKey: string): string {
  try {
    // 确保私钥没有0x前缀
    if (privateKey.startsWith('0x')) {
      privateKey = privateKey.slice(2);
    }
    
    // 使用secp256k1曲线从私钥创建密钥对
    const keyPair = ec.keyFromPrivate(privateKey, 'hex');
    
    // 获取公钥（非压缩格式，包含04前缀）
    const publicKey = keyPair.getPublic('hex');
    
    return publicKey;
  } catch (error) {
    console.error('Error deriving public key:', error);
    throw new Error('无法从私钥推导公钥');
  }
}

// 从私钥推导ERC20地址 (按以太坊官方标准)
export function deriveERC20Address(privateKey: string): string {
  try {
    // 确保私钥格式正确
    if (privateKey.startsWith('0x')) {
      privateKey = privateKey.slice(2);
    }
    
    // 1. 从私钥获取公钥
    const publicKeyHex = derivePublicKeyFromPrivate(privateKey);
    
    // 2. 移除公钥的前缀(04)
    const publicKeyWithoutPrefix = publicKeyHex.slice(2);
    
    // 3. 对公钥进行Keccak-256哈希
    const hash = keccak256Any(publicKeyWithoutPrefix);
    
    // 4. 取哈希的后20字节作为地址
    const address = '0x' + hash.slice(-40);
    
    // 5. 返回小写形式的地址
    return address.toLowerCase();
  } catch (error) {
    console.error('Error deriving ERC20 address:', error);
    throw new Error('无法从私钥推导ERC20地址');
  }
}

// 验证ERC20地址格式
export function validateERC20Address(address: string): boolean {
  // 基本格式验证
  if (!address || typeof address !== 'string') {
    return false;
  }
  
  // 检查前缀和长度
  if (!address.startsWith('0x') || address.length !== 42) {
    return false;
  }
  
  // 检查字符是否为有效的十六进制字符
  return /^0x[0-9a-f]{40}$/i.test(address);
}

// 将ERC20地址转换为校验和格式
export function toChecksumAddress(address: string): string {
  if (!validateERC20Address(address)) {
    throw new Error("无效的地址格式");
  }
  
  // 移除0x前缀并转为小写
  const addressLower = address.slice(2).toLowerCase();
  
  // 计算地址的keccak256哈希
  const hash = keccak256Any(addressLower);
  
  // 应用EIP-55校验和算法
  let result = '0x';
  for (let i = 0; i < addressLower.length; i++) {
    // 如果哈希的相应半字节 >= 8，大写该字符
    if (parseInt(hash[i], 16) >= 8) {
      result += addressLower[i].toUpperCase();
    } else {
      result += addressLower[i];
    }
  }
  
  return result;
}
