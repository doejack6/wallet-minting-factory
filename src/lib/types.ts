
export type WalletType = 'TRC20' | 'ERC20';

export interface Wallet {
  id: string;
  address: string;
  privateKey: string;
  publicKey: string;
  type: WalletType;
  createdAt: Date;
}

export interface GeneratorConfig {
  trc20Ratio: number; // TRC20生成比例 (0-100)
  threadCount: number; // 线程数
  batchSize: number; // 批处理大小
  memoryLimit: number; // 内存限制(MB)
}

export interface GeneratorStats {
  totalGenerated: number;
  todayGenerated: number;
  trc20Count: number;
  erc20Count: number;
  generationSpeed: number;
  uptime: number;
  lastGenerated: Date | null;
}

export interface DatabaseStats {
  totalStored: number;
  databaseSize: string;
  lastWrite: Date | null;
  writeSpeed: number;
  trc20Count: number;
  erc20Count: number;
}

export type SearchPatternType = 'ANY' | 'END' | 'START' | 'START_END' | 'CUSTOM';

export interface FilterOptions {
  type: WalletType | 'ALL';
  pattern: string;
  patternType: SearchPatternType;
  patternLength: number;
  dateFrom: Date | null;
  dateTo: Date | null;
  limit: number;
}

export interface StatusInfo {
  running: boolean;
  currentSpeed: number;
  targetSpeed: number;
  threads: number;
  memoryUsage: string;
  cpuUsage: number;
}
