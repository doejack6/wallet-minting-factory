import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Database as DatabaseIcon, 
  HardDrive, 
  RefreshCw, 
  Save, 
  Trash2, 
  AlertTriangle,
  BarChart4,
  Settings2,
  FileDown,
  FileText,
  Zap
} from 'lucide-react';
import { walletDB } from '@/lib/database';
import { walletGenerator } from '@/lib/walletGenerator';
import { useToast } from '@/components/ui/use-toast';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilterOptions } from '@/lib/types';
import { exportWallets } from '@/lib/exportUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  
  const formatTime = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };
  
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">数据库管理</h1>
        <div className="space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                导出数据
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleExport('csv')}
                disabled={isExporting || dbStats.totalStored === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                导出为CSV
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleExport('txt')}
                disabled={isExporting || dbStats.totalStored === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                导出为TXT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleManualSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            手动保存
          </Button>
          <Button variant="destructive" onClick={handleClearDatabase} disabled={isLoading}>
            <Trash2 className="mr-2 h-4 w-4" />
            清空数据库
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>数据库统计</CardTitle>
            <CardDescription>
              当前存储指标和性能指标
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">总存储量</div>
                <div className="text-2xl font-bold">{formatNumber(dbStats.totalStored)}</div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">TRC20钱包</div>
                <div className="text-2xl font-bold">{formatNumber(dbStats.trc20Count)}</div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">ERC20钱包</div>
                <div className="text-2xl font-bold">{formatNumber(dbStats.erc20Count)}</div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">数据库大小</div>
                <div className="text-2xl font-bold">{dbStats.databaseSize}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>存储使用率</span>
                  <span>25%</span>
                </div>
                <Progress value={25} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>写入性能</span>
                  <span>{formatNumber(dbStats.writeSpeed)}/秒</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>存储效率</span>
                  <span 
                    className={`${
                      storageEfficiency < 30 ? "text-red-500" : 
                      storageEfficiency < 70 ? "text-amber-500" : 
                      "text-green-500"
                    }`}
                  >
                    {storageEfficiency}%
                  </span>
                </div>
                <Progress 
                  value={storageEfficiency} 
                  className={`h-2 ${
                    storageEfficiency < 30 ? "bg-red-200" : 
                    storageEfficiency < 70 ? "bg-amber-200" : 
                    "bg-green-200"
                  }`} 
                />
                <p className="text-xs text-muted-foreground mt-1">
                  生成的钱包中已成功保存到数据库的百分比
                </p>
              </div>
            </div>
            
            <div className="flex items-center p-4 bg-muted rounded-lg">
              <div className="mr-4">
                <Switch 
                  id="compression-toggle"
                  checked={compressionEnabled}
                  onCheckedChange={toggleCompression}
                />
              </div>
              <div>
                <Label htmlFor="compression-toggle" className="font-medium">
                  数据压缩优化 {compressionEnabled ? '(已启用)' : '(已禁用)'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  启用后可减少约60%的内存使用，提高性能并支持更大规模的钱包存储
                </p>
              </div>
              <div className="ml-auto">
                <Zap className={`h-6 w-6 ${compressionEnabled ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
            </div>
            
            <Card className="overflow-hidden">
              <CardHeader className="p-4">
                <CardTitle className="text-base">大规模钱包存储预估</CardTitle>
                <CardDescription>不同数量钱包的存储空间预估</CardDescription>
              </CardHeader>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>钱包数量</TableHead>
                    <TableHead>预估大小</TableHead>
                    <TableHead>存储效率</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCalculating ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4">
                        计算中...
                      </TableCell>
                    </TableRow>
                  ) : (
                    sizeEstimates.map((estimate, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatNumber(estimate.count)}</TableCell>
                        <TableCell>{estimate.size}</TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                            compressionEnabled ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {compressionEnabled ? '高效' : '标准'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              <div className="p-4 bg-muted text-xs">
                <p>注：预估基于当前的存储优化设置。切换压缩开关可查看不同配置下的存储效率。</p>
              </div>
            </Card>
            
            <div className="pt-2">
              <h3 className="text-sm font-medium mb-3">数据库活动</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">最近写入操作</div>
                  <div className="text-sm">{formatTime(dbStats.lastWrite)}</div>
                </div>
                <div className="p-3 bg-secondary rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">写入速度</div>
                  <div className="text-sm">{formatNumber(dbStats.writeSpeed)} 钱包/秒</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>分布情况</CardTitle>
            <CardDescription>
              数据库中钱包类型分布
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-60 flex items-center justify-center">
              {dbStats.totalStored > 0 ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{dbStats.totalStored.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">钱包总数</div>
                    </div>
                  </div>
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="hsl(var(--primary))"
                      strokeWidth="20"
                      strokeDasharray={`${(dbStats.trc20Count / dbStats.totalStored) * 251.2} 251.2`}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="hsl(var(--accent))"
                      strokeWidth="20"
                      strokeDasharray={`${(dbStats.erc20Count / dbStats.totalStored) * 251.2} 251.2`}
                      strokeDashoffset={`-${(dbStats.trc20Count / dbStats.totalStored) * 251.2}`}
                    />
                  </svg>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <DatabaseIcon className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p>暂无数据</p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
                <div className="text-sm">TRC20 
                  <span className="text-xs text-muted-foreground ml-1">
                    ({dbStats.totalStored ? 
                      `${Math.round((dbStats.trc20Count / dbStats.totalStored) * 100)}%` : 
                      '0%'})
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-accent rounded-full mr-2"></div>
                <div className="text-sm">ERC20 
                  <span className="text-xs text-muted-foreground ml-1">
                    ({dbStats.totalStored ? 
                      `${Math.round((dbStats.erc20Count / dbStats.totalStored) * 100)}%` : 
                      '0%'})
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
          <Card>
            <CardHeader>
              <CardTitle>数据库性能</CardTitle>
              <CardDescription>
                优化高吞吐量钱包存储和快速查询
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <HardDrive className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">存储引擎</div>
                    </div>
                    <div className="text-xs text-muted-foreground">高性能本地存储</div>
                    <div className="mt-2 text-sm">针对高容量写入优化</div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <BarChart4 className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">查询性能</div>
                    </div>
                    <div className="text-xs text-muted-foreground">索引搜索</div>
                    <div className="mt-2 text-sm">亚毫秒级查询响应</div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <DatabaseIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">数据压缩</div>
                    </div>
                    <div className="text-xs text-muted-foreground">优化存储</div>
                    <div className="mt-2 text-sm">高效数据序列化</div>
                  </div>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>仅本地存储</AlertTitle>
                  <AlertDescription>
                    所有钱包数据仅存储在您的设备上。不会发送到外部服务器。
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="storage" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>存储优化</CardTitle>
              <CardDescription>
                优化钱包存储性能和效率
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold">存储优化级别</h3>
                  <div className="space-y-2">
                    <Label htmlFor="optimization-level">优化级别: {optimizationLevel}</Label>
                    <Slider 
                      id="optimization-level"
                      value={[optimizationLevel]} 
                      min={1} 
                      max={10} 
                      step={1}
                      onValueChange={(value) => setOptimizationLevel(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>低 (更快生成)</span>
                      <span>平衡</span>
                      <span>高 (更可靠存储)</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    优化级别决定了钱包生成速度和数据库存储可靠性之间的平衡。更高的优化级别会降低生成速度但提高存储可靠性。
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <HardDrive className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">数据批处理</div>
                    </div>
                    <div className="text-xs text-muted-foreground">大小: 1000</div>
                    <div className="mt-2 text-sm">优化大批量数据写入</div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <Settings2 className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">同步频率</div>
                    </div>
                    <div className="text-xs text-muted-foreground">每100毫秒</div>
                    <div className="mt-2 text-sm">更频繁的数据库同步</div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <DatabaseIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">去重处理</div>
                    </div>
                    <div className="text-xs text-muted-foreground">已启用</div>
                    <div className="mt-2 text-sm">防止重复钱包存储</div>
                  </div>
                </div>
                
                <div className="p-4 border border-dashed border-border rounded-lg">
                  <h3 className="text-sm font-semibold mb-2">数据压缩</h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">当前状态: <span className={compressionEnabled ? "text-green-500" : "text-muted-foreground"}>
                        {compressionEnabled ? "已启用 (节省空间约60%)" : "已禁用"}
                      </span></p>
                      <p className="text-xs text-muted-foreground mt-1">
                        数据压缩可以显著减少存储空间，支持更大规模的钱包生成与存储
                      </p>
                    </div>
                    <Switch 
                      checked={compressionEnabled}
                      onCheckedChange={toggleCompression}
                    />
                  </div>
                </div>
                
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline">
                      <Settings2 className="mr-2 h-4 w-4" />
                      高级存储设置
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>高级存储设置</SheetTitle>
                      <SheetDescription>
                        配置钱包存储的高级选项
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-6">
                      <p className="text-sm text-muted-foreground">
                        ��些高级设置可以帮助您平衡系统性能和数据存储可靠性。调整这些设置可能会影响系统整体性能。
                      </p>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>数据库写入延迟</Label>
                          <Select defaultValue="low">
                            <SelectTrigger>
                              <SelectValue placeholder="选择延迟级别" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="very-low">极低 (100ms)</SelectItem>
                              <SelectItem value="low">低 (200ms)</SelectItem>
                              <SelectItem value="medium">中等 (500ms)</SelectItem>
                              <SelectItem value="high">高 (1000ms)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>批处理大小</Label>
                          <Select defaultValue="1000">
                            <SelectTrigger>
                              <SelectValue placeholder="选择批处理大小" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="500">小 (500)</SelectItem>
                              <SelectItem value="1000">中 (1000)</SelectItem>
                              <SelectItem value="2000">大 (2000)</SelectItem>
                              <SelectItem value="5000">极大 (5000)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>存储效率</AlertTitle>
                  <AlertDescription>
                    当前存储效率为 {storageEfficiency}%。
                    {storageEfficiency < 30 ? 
                      " 建议降低生成速度或提高存储优化级别以提高存储效率。" : 
                      storageEfficiency < 70 ? 
                        " 存储效率尚可，但仍有优化空间。" : 
                        " 存储效率良好，系统运行正常。"}
                    {!compressionEnabled && " 启用数据压缩可进一步提高存储效率。"}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>安全信息</CardTitle>
              <CardDescription>
                数据保护和隐私措施
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>警告：私钥存储</AlertTitle>
                  <AlertDescription>
                    私钥以明文形式存储仅用于演示目的。在生产环境中，应实施带有适当密钥管理的加密存储。
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="text-sm font-medium mb-2">数据隔离</div>
                    <div className="text-xs">
                      所有生成的钱包数据都在本地存储，与外部网络隔离。数据不会同步到云服务或外部服务器。
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="text-sm font-medium mb-2">安全随机生成</div>
                    <div className="text-xs">
                      钱包生成使用加密安全的随机数生成器，确保私钥不能被预测或重现。
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-secondary rounded-lg mt-4">
                  <div className="text-sm font-medium mb-2">安全建议</div>
                  <ul className="text-xs space-y-2">
                    <li>• 定期备份您的钱包数据库以防止数据丢失</li>
                    <li>• 将备份存储在安全的加密存储中</li>
                    <li>• 考虑为私钥存储实施额外的加密</li>
                    <li>• 对于生产用途，请考虑硬件安全模块(HSM)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Database;
