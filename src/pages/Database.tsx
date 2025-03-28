
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw } from 'lucide-react';
import { walletDB } from '@/lib/database';
import { walletGenerator } from '@/lib/walletGenerator';
import { useToast } from '@/components/ui/use-toast';
import { FilterOptions } from '@/lib/types';
import { exportWallets } from '@/lib/exportUtils';

// Import the newly created components
import DatabaseStats from '@/components/database/DatabaseStats';
import DatabaseChart from '@/components/database/DatabaseChart';
import DatabaseActions from '@/components/database/DatabaseActions';
import PerformanceTab from '@/components/database/PerformanceTab';
import StorageOptimizationTab from '@/components/database/StorageOptimizationTab';
import SecurityTab from '@/components/database/SecurityTab';

const Database: React.FC = () => {
  const { toast } = useToast();
  const [dbStats, setDbStats] = useState({
    totalStored: 0,
    trc20Count: 0,
    erc20Count: 0,
    databaseSize: '0 bytes',
    lastWrite: null as Date | null,
    writeSpeed: 0,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [storageEfficiency, setStorageEfficiency] = useState(0);
  const [optimizationLevel, setOptimizationLevel] = useState(5); // 1-10 scale
  const [isExporting, setIsExporting] = useState(false);
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [sizeEstimates, setSizeEstimates] = useState([
    { count: 100_000, size: '0 MB' },
    { count: 1_000_000, size: '0 MB' },
    { count: 10_000_000, size: '0 GB' },
    { count: 100_000_000, size: '0 GB' },
  ]);
  
  useEffect(() => {
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
    
    updateStats();
    
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    updateSizeEstimates();
  }, [compressionEnabled]);
  
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
  
  const toggleCompression = () => {
    const newState = !compressionEnabled;
    setCompressionEnabled(newState);
    walletDB.setCompressionEnabled(newState);
    
    toast({
      title: newState ? "存储优化已启用" : "存储优化已禁用",
      description: newState 
        ? "数据压缩已启用，这将减少内存使用并提高性能。" 
        : "数据压缩已禁用，这可能会增加内存使用。",
    });
    
    updateSizeEstimates();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">数据库管理</h1>
        <DatabaseActions 
          isLoading={isLoading}
          isExporting={isExporting}
          totalStored={dbStats.totalStored}
          onManualSave={handleManualSave}
          onClearDatabase={handleClearDatabase}
          onExport={handleExport}
        />
      </div>
      
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
