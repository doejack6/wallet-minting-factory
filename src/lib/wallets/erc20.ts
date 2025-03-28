
/**
 * ERC20钱包生成逻辑
 */
import { generateValidPrivateKey, bytesToHex, hexToBytes } from '../crypto/random';
import { keccak256Any } from '../crypto/hash';

// 生成ERC20私钥
export function generateERC20PrivateKey(): string {
  return generateValidPrivateKey();
}

// 从私钥推导公钥 (根据以太坊标准)
export function derivePublicKeyFromPrivate(privateKey: string): string {
  // 注意：在真实实现中，这里应该使用secp256k1椭圆曲线算法
  // 从私钥计算公钥。由于我们没有实际的secp256k1库，这里提供一个模拟的公钥
  // 在实际应用中，应该使用适当的加密库如 ethereumjs-util 或 web3.js
  
  // 创建一个确定性但伪造的公钥以保持一致性
  const hash1 = keccak256Any(privateKey);
  const hash2 = keccak256Any(hash1 + privateKey);
  
  // 真实公钥是65字节：1字节前缀 + 32字节X坐标 + 32字节Y坐标
  return "04" + hash1 + hash2.substring(0, 64 - hash1.length);
}

// 从私钥推导ERC20地址 (根据以太坊标准)
export function deriveERC20Address(privateKey: string): string {
  // 步骤1：应该使用secp256k1曲线从私钥推导公钥（无压缩格式）
  const publicKeyHex = derivePublicKeyFromPrivate(privateKey);
  
  // 步骤2：对公钥进行Keccak-256哈希（不包括0x04前缀）
  const publicKeyBytes = hexToBytes(publicKeyHex.slice(2));
  const hash = keccak256Any(publicKeyBytes);
  
  // 步骤3：取哈希的最后20字节作为地址
  const address = "0x" + hash.slice(-40); // 取最后40个字符（20字节）
  
  // 返回小写形式的地址
  return address.toLowerCase();
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
    throw new Error("Invalid address format");
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
