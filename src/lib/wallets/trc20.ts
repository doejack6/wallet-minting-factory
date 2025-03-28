
/**
 * TRC20钱包生成逻辑 - 按照TRON官方规范实现
 */
import { generateValidPrivateKey, bytesToHex, hexToBytes } from '../crypto/random';
import { sha256Bytes } from '../crypto/hash';
import { base58check } from '../crypto/base58';
import { ec as EC } from 'elliptic';
import * as CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// 使用elliptic库进行椭圆曲线计算
const ec = new EC('secp256k1');

// 生成TRC20私钥
export function generateTRC20PrivateKey(): string {
  return generateValidPrivateKey();
}

// 从私钥生成公钥 (使用secp256k1椭圆曲线)
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

// 从私钥推导TRC20地址 - 严格遵循TRON标准
export function deriveTRC20Address(privateKey: string): string {
  try {
    // 确保私钥格式正确
    if (privateKey.startsWith('0x')) {
      privateKey = privateKey.slice(2);
    }
    
    // 1. 从私钥获取公钥
    const fullPublicKey = derivePublicKeyFromPrivate(privateKey);
    
    // 2. 移除公钥的前缀(04)，获取完整的X和Y坐标
    const publicKeyWithoutPrefix = fullPublicKey.slice(2);
    
    // 3. 对公钥进行SHA3-256(Keccak)哈希
    const sha3Hash = CryptoJS.SHA3(
      CryptoJS.enc.Hex.parse(publicKeyWithoutPrefix), 
      { outputLength: 256 }
    );
    const sha3HashHex = sha3Hash.toString(CryptoJS.enc.Hex);
    
    // 4. 取SHA3哈希的最后20字节
    const addressHex = sha3HashHex.slice(-40);
    const addressBytes = hexToBytes(addressHex);
    
    // 5. 添加TRON地址前缀(0x41 = 65)并使用Base58Check编码
    return base58check(addressBytes, 0x41);
  } catch (error) {
    console.error('Error deriving TRC20 address:', error);
    throw new Error('无法从私钥推导TRC20地址');
  }
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
    throw new Error("无效的十六进制地址长度");
  }
  
  // 转换为字节数组并添加前缀
  const addressBytes = hexToBytes(hexAddress);
  
  // 使用Base58Check编码
  return base58check(addressBytes, 0x41);
}

// Helper function to generate a complete TRC20 wallet
export function generateTRC20Wallet(): { id: string, type: 'TRC20', address: string, privateKey: string, publicKey: string, createdAt: Date } {
  const privateKey = generateTRC20PrivateKey();
  const publicKey = derivePublicKeyFromPrivate(privateKey);
  const address = deriveTRC20Address(privateKey);
  
  return {
    id: uuidv4(),
    type: 'TRC20',
    address,
    privateKey,
    publicKey,
    createdAt: new Date()
  };
}
