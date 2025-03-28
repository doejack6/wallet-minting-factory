
import React from 'react';
import DatabaseStats from './DatabaseStats';
import DatabaseChart from './DatabaseChart';

interface DatabaseMainGridProps {
  dbStats: {
    totalStored: number;
    trc20Count: number;
    erc20Count: number;
    databaseSize: string;
    lastWrite: Date | null;
    writeSpeed: number;
  };
  storageEfficiency: number;
  compressionEnabled: boolean;
  toggleCompression: () => void;
  sizeEstimates: { count: number; size: string }[];
  isCalculating: boolean;
}

const DatabaseMainGrid: React.FC<DatabaseMainGridProps> = ({
  dbStats,
  storageEfficiency,
  compressionEnabled,
  toggleCompression,
  sizeEstimates,
  isCalculating
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <DatabaseStats 
        dbStats={dbStats}
        storageEfficiency={storageEfficiency}
        compressionEnabled={compressionEnabled}
        toggleCompression={toggleCompression}
        sizeEstimates={sizeEstimates}
        isCalculating={isCalculating}
      />
      
      <DatabaseChart 
        totalStored={dbStats.totalStored}
        trc20Count={dbStats.trc20Count}
        erc20Count={dbStats.erc20Count}
      />
    </div>
  );
};

export default DatabaseMainGrid;
