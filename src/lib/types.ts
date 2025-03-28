
export type WalletType = 'TRC20' | 'ERC20';

export interface Wallet {
  id: string;
  address: string;
  privateKey: string;
  publicKey: string;
  type: WalletType;
  createdAt: Date;
}

export interface GeneratorStats {
  totalGenerated: number;
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
}

export interface FilterOptions {
  type: WalletType | 'ALL';
  pattern: string;
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
