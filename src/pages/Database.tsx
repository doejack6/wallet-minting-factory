
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { walletDB } from '@/lib/database';
import { walletGenerator } from '@/lib/walletGenerator';
import { useToast } from '@/components/ui/use-toast';
import { exportWallets } from '@/lib/exportUtils';

import DatabaseHeader from '@/components/database/DatabaseHeader';
import DatabaseMainGrid from '@/components/database/DatabaseMainGrid';
import { useDatabaseStats } from '@/hooks/useDatabaseStats';
import PerformanceTab from '@/components/database/PerformanceTab';
import StorageOptimizationTab from '@/components/database/StorageOptimizationTab';
import SecurityTab from '@/components/database/SecurityTab';

const Database: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [optimizationLevel, setOptimizationLevel] = useState(5);

  const {
    dbStats,
    storageEfficiency,
    compressionEnabled,
    toggleCompression,
    sizeEstimates,
    isCalculating,
    updateSizeEstimates,
  } = useDatabaseStats();

  const handleManualSave = async () => {
    setIsLoading(true);
    try {
      await walletDB.storeWallets(walletGenerator.getLastBatch(10000));
      toast({
        title: "成功",
        description: "钱包已成功保存到数据库。",
      });
    } catch (error) {
      console.error('Failed to save wallets', error);
      toast({
        title: "错误",
        description: "保存钱包到数据库失败。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearDatabase = async () => {
    if (window.confirm('确定要清空数据库吗？此操作无法撤销。')) {
      setIsLoading(true);
      try {
        await walletDB.clearDatabase();
        toast({
          title: "数据库已清空",
          description: "所有钱包记录已从数据库中删除。",
        });
      } catch (error) {
        console.error('Failed to clear database', error);
        toast({
          title: "错误",
          description: "清空数据库失败。",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleExport = async (format: 'csv' | 'txt') => {
    setIsExporting(true);
    try {
      const allWallets = await walletDB.getWallets({
        type: 'ALL',
        pattern: '',
        patternType: 'ANY',
        patternLength: 0,
        dateFrom: null,
        dateTo: null,
        limit: 1000000,
      });
      
      exportWallets(allWallets, format, `wallet-database-export.${format}`);
      
      toast({
        title: "导出成功",
        description: `已成功导出 ${allWallets.length} 条记录到 ${format.toUpperCase()} 文件。`,
      });
    } catch (error) {
      console.error('Failed to export wallets', error);
      toast({
        title: "导出失败",
        description: "导出钱包数据时出错。",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <DatabaseHeader 
        isLoading={isLoading}
        isExporting={isExporting}
        totalStored={dbStats.totalStored}
        onManualSave={handleManualSave}
        onClearDatabase={handleClearDatabase}
        onExport={handleExport}
        updateSizeEstimates={updateSizeEstimates}
      />
      
      <DatabaseMainGrid 
        dbStats={dbStats}
        storageEfficiency={storageEfficiency}
        compressionEnabled={compressionEnabled}
        toggleCompression={toggleCompression}
        sizeEstimates={sizeEstimates}
        isCalculating={isCalculating}
      />
      
      <Tabs defaultValue="performance">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="performance">性能</TabsTrigger>
            <TabsTrigger value="storage">存储优化</TabsTrigger>
            <TabsTrigger value="security">安全</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={updateSizeEstimates}>
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新统计
          </Button>
        </div>
        
        <TabsContent value="performance" className="mt-0">
          <PerformanceTab />
        </TabsContent>
        
        <TabsContent value="storage" className="mt-0">
          <StorageOptimizationTab 
            optimizationLevel={optimizationLevel}
            setOptimizationLevel={setOptimizationLevel}
            compressionEnabled={compressionEnabled}
            toggleCompression={toggleCompression}
            storageEfficiency={storageEfficiency}
          />
        </TabsContent>
        
        <TabsContent value="security" className="mt-0">
          <SecurityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Database;
