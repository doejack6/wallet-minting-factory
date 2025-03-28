
import { Wallet } from './types';

/**
 * Formats wallet data as CSV
 */
export const formatAsCSV = (wallets: Wallet[]): string => {
  // Create CSV header
  const header = 'ID,Address,Type,Created At,Private Key,Public Key';
  
  // Create CSV rows
  const rows = wallets.map(wallet => {
    return `${wallet.id},${wallet.address},${wallet.type},${wallet.createdAt.toISOString()},${wallet.privateKey},${wallet.publicKey}`;
  });
  
  // Combine header and rows
  return [header, ...rows].join('\n');
};

/**
 * Formats wallet data as TXT
 */
export const formatAsTXT = (wallets: Wallet[]): string => {
  return wallets.map(wallet => {
    return `ID: ${wallet.id}\nAddress: ${wallet.address}\nType: ${wallet.type}\nCreated: ${wallet.createdAt.toLocaleString()}\nPrivate Key: ${wallet.privateKey}\nPublic Key: ${wallet.publicKey}\n\n`;
  }).join('---\n\n');
};

/**
 * Downloads data as a file
 */
export const downloadAsFile = (data: string, filename: string, type: 'csv' | 'txt'): void => {
  // Create file content
  const mimeTypes = {
    'csv': 'text/csv;charset=utf-8;',
    'txt': 'text/plain;charset=utf-8;'
  };
  
  // Create blob
  const blob = new Blob([data], { type: mimeTypes[type] });
  
  // Create download URL
  const url = URL.createObjectURL(blob);
  
  // Create temporary link element
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  
  // Add link to document
  document.body.appendChild(link);
  
  // Click link to start download
  link.click();
  
  // Remove link from document
  document.body.removeChild(link);
  
  // Release URL object
  URL.revokeObjectURL(url);
};

/**
 * Export filtered wallets to file
 */
export const exportWallets = (wallets: Wallet[], format: 'csv' | 'txt', filename?: string): void => {
  // Format the data
  const data = format === 'csv' ? formatAsCSV(wallets) : formatAsTXT(wallets);
  
  // Generate filename if not provided
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `wallets-export-${timestamp}.${format}`;
  
  // Download the file
  downloadAsFile(data, filename || defaultFilename, format);
};
