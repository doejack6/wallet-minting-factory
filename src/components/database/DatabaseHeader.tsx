
import React from 'react';
import DatabaseActions from './DatabaseActions';

interface DatabaseHeaderProps {
  isLoading: boolean;
  isExporting: boolean;
  totalStored: number;
  onManualSave: () => void;
  onClearDatabase: () => void;
  onExport: (format: 'csv' | 'txt') => void;
  updateSizeEstimates: () => void;
}

const DatabaseHeader: React.FC<DatabaseHeaderProps> = ({
  isLoading,
  isExporting,
  totalStored,
  onManualSave,
  onClearDatabase,
  onExport,
  updateSizeEstimates
}) => {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">数据库管理</h1>
      <DatabaseActions 
        isLoading={isLoading}
        isExporting={isExporting}
        totalStored={totalStored}
        onManualSave={onManualSave}
        onClearDatabase={onClearDatabase}
        onExport={onExport}
      />
    </div>
  );
};

export default DatabaseHeader;
