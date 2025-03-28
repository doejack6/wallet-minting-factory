
import { useState, useEffect } from 'react';
import { walletDB } from '@/lib/database';
import { walletGenerator } from '@/lib/walletGenerator';

export const useDatabaseStats = () => {
  const [dbStats, setDbStats] = useState({
    totalStored: 0,
    trc20Count: 0,
    erc20Count: 0,
    databaseSize: '0 bytes',
    lastWrite: null as Date | null,
    writeSpeed: 0,
  });
  
  const [storageEfficiency, setStorageEfficiency] = useState(0);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [sizeEstimates, setSizeEstimates] = useState([
    { count: 100_000, size: '0 MB' },
    { count: 1_000_000, size: '0 MB' },
    { count: 10_000_000, size: '0 GB' },
    { count: 100_000_000, size: '0 GB' },
  ]);

  const updateStats = () => {
    const totalGenerated = walletGenerator.getTotalGenerated();
    const totalStored = walletDB.getTotalCount();
    
    setDbStats({
      totalStored: totalStored,
      trc20Count: walletDB.getTypeCount('TRC20'),
      erc20Count: walletDB.getTypeCount('ERC20'),
      databaseSize: walletDB.getDatabaseSize(),
      lastWrite: walletDB.getLastWrite(),
      writeSpeed: walletDB.getWriteSpeed(),
    });
    
    if (totalGenerated > 0) {
      setStorageEfficiency(Math.floor((totalStored / totalGenerated) * 100));
    }
    
    setCompressionEnabled(walletDB.isCompressionEnabled());
  };

  const updateSizeEstimates = () => {
    setIsCalculating(true);
    
    setTimeout(() => {
      setSizeEstimates([
        { count: 100_000, size: walletDB.estimateSizeForWalletCount(100_000) },
        { count: 1_000_000, size: walletDB.estimateSizeForWalletCount(1_000_000) },
        { count: 10_000_000, size: walletDB.estimateSizeForWalletCount(10_000_000) },
        { count: 100_000_000, size: walletDB.estimateSizeForWalletCount(100_000_000) },
      ]);
      setIsCalculating(false);
    }, 100);
  };

  const toggleCompression = () => {
    const newState = !compressionEnabled;
    setCompressionEnabled(newState);
    walletDB.setCompressionEnabled(newState);
    updateSizeEstimates();
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    updateSizeEstimates();
  }, [compressionEnabled]);

  return {
    dbStats,
    storageEfficiency,
    compressionEnabled,
    toggleCompression,
    sizeEstimates,
    isCalculating,
    updateSizeEstimates,
  };
};
