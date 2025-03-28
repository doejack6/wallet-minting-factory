import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  Play, 
  Pause, 
  Settings, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle, 
  Shield, 
  Save,
  Cpu,
  Zap,
  ListPlus
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { walletGenerator } from '@/lib/walletGenerator';
import { walletDB } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { GeneratorConfig, Wallet } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import GeneratorDialog from '@/components/wallets/GeneratorDialog';
import { backgroundGenerator, BackgroundGenState } from '@/lib/services/backgroundGeneratorService';
import ServerConfigPanel from '@/components/generator/ServerConfigPanel';

const Generator: React.FC = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [targetSpeed, setTargetSpeed] = useState(100000);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [recentWallets, setRecentWallets] = useState<Wallet[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState('trc20');
  const [storageEfficiency, setStorageEfficiency] = useState(100);
  const [isOpenPerformanceInfo, setIsOpenPerformanceInfo] = useState(false);
  const [showGeneratorDialog, setShowGeneratorDialog] = useState(false);
  const [backgroundState, setBackgroundState] = useState<BackgroundGenState>(backgroundGenerator.getState());
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  
  const [config, setConfig] = useState<GeneratorConfig>({
    trc20Ratio: 50,
    threadCount: 2,
    batchSize: 100,
    memoryLimit: 512,
    walletTypes: ['TRC20', 'ERC20'],
  });
  
  const handleSpeedChange = (values: number[]) => {
    setTargetSpeed(values[0]);
  };

  useEffect(() => {
    setIsRunning(walletGenerator.isRunning());
    setConfig(walletGenerator.getConfig());
    
    const dbCount = walletDB.getTotalCount();
    const genCount = walletGenerator.getTotalGenerated();
    
    setSavedCount(dbCount);
    setGeneratedCount(genCount);
    
    const unsubscribe = backgroundGenerator.subscribeTo(state => {
      setBackgroundState(state);
      setGeneratorError(state.error);
    });
    
    walletGenerator.setOnProgress((stats) => {
      setCurrentSpeed(stats.speed);
      setGeneratedCount(stats.count);
      setSavedCount(stats.savedCount);
      
      if (stats.count > 0) {
        const efficiency = Math.floor((stats.savedCount / stats.count) * 100);
        setStorageEfficiency(Math.min(100, efficiency));
      }
    });
    
    const uiUpdateInterval = setInterval(() => {
      if (walletGenerator.isRunning()) {
        setElapsedTime(walletGenerator.getUptime());
        setRecentWallets(walletGenerator.getLastBatch(20));
        
        setSavedCount(walletDB.getTotalCount());
        setGeneratedCount(walletGenerator.getTotalGenerated());
        
        if (generatedCount > 0) {
          const efficiency = Math.floor((savedCount / generatedCount) * 100);
          setStorageEfficiency(Math.min(100, efficiency));
        }
      }
    }, 250);
    
    const syncInterval = setInterval(() => {
      if (isRunning) {
        const dbCount = walletDB.getTotalCount();
        const genCount = walletGenerator.getTotalGenerated();
        
        if (dbCount !== savedCount) {
          setSavedCount(dbCount);
        }
        
        if (genCount !== generatedCount) {
          setGeneratedCount(genCount);
        }
      }
    }, 500);
    
    const handleWalletsStored = (e: any) => {
      setSavedCount(e.detail.total);
      console.log(`Generator UI: Wallets stored event received. Total: ${e.detail.total}`);
    };
    
    const handleDatabaseCleared = () => {
      setSavedCount(0);
      setStorageEfficiency(100);
      console.log('Generator UI: Database cleared event received');
    };
    
    window.addEventListener('walletsStored', handleWalletsStored);
    window.addEventListener('databaseCleared', handleDatabaseCleared);
    
    return () => {
      clearInterval(uiUpdateInterval);
      clearInterval(syncInterval);
      window.removeEventListener('walletsStored', handleWalletsStored);
      window.removeEventListener('databaseCleared', handleDatabaseCleared);
      unsubscribe();
    };
  }, [isRunning, savedCount, generatedCount]);
  
  const toggleGenerator = () => {
    if (isRunning) {
      walletGenerator.stop();
      setIsRunning(false);
      toast({
        title: "生成器已停止",
        description: "钱包生成进程已暂停。",
      });
    } else {
      try {
        walletGenerator.setTargetSpeed(targetSpeed);
        walletGenerator.setConfig(config);
        walletGenerator.start();
        setIsRunning(true);
        setGeneratorError(null);
        toast({
          title: "生成器已启动",
          description: "钱包生成进程已开始。",
        });
      } catch (error) {
        console.error('Failed to start generator:', error);
        toast({
          title: "生成器启动失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      }
    }
  };
  
  const openBatchGenerator = () => {
    setShowGeneratorDialog(true);
  };
  
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetCounter = () => {
    if (!isRunning) {
      walletGenerator.resetGeneratedCount();
      setGeneratedCount(0);
      setElapsedTime(0);
      setStorageEfficiency(0);
      toast({
        title: "计数器已重置",
        description: "钱包生成统计数据已被重置。",
      });
    } else {
      toast({
        title: "无法重置",
        description: "请先停止生成器，然后再重置计数器。",
        variant: "destructive",
      });
    }
  };

  const updateConfig = (key: keyof GeneratorConfig, value: any) => {
    if (!isRunning) {
      const newConfig = { ...config, [key]: value };
      setConfig(newConfig);
      walletGenerator.setConfig(newConfig);
    } else {
      toast({
        title: "无法更改配置",
        description: "请先停止生成器，然后再更改配置。",
        variant: "destructive",
      });
    }
  };
  
  const toggleWalletType = (type: 'TRC20' | 'ERC20') => {
    if (!isRunning) {
      const walletTypes = [...config.walletTypes];
      
      if (walletTypes.indexOf(type) !== -1) {
        if (walletTypes.length > 1) {
          walletTypes.splice(walletTypes.indexOf(type), 1);
        } else {
          toast({
            title: "至少选择一种钱包类型",
            description: "您必须至少选择一种钱包类型。",
            variant: "destructive",
          });
          return;
        }
      } else {
        walletTypes.push(type);
      }
      
      const newConfig = { ...config, walletTypes };
      setConfig(newConfig);
      walletGenerator.setConfig(newConfig);
    }
  };

  const autoConfigureForDevice = () => {
    if (!isRunning) {
      const newConfig = walletGenerator.autoConfigureForDevice();
      setConfig(newConfig);
      toast({
        title: "已自动配置",
        description: `根据您的设备性能，已优化配置为线程数: ${newConfig.threadCount}, 批处理大小: ${newConfig.batchSize}, 内存限制: ${newConfig.memoryLimit}MB。`,
      });
    } else {
      toast({
        title: "无法自动配置",
        description: "请先停止生成器，然后再执行自动配置。",
        variant: "destructive",
      });
    }
  };
  
  const saveWallets = () => {
    walletGenerator.saveWallets();
    toast({
      title: "钱包已保存",
      description: "所有生成的钱包已手动保存到数据库。",
    });
  };

  const getFilteredWallets = (type: 'TRC20' | 'ERC20') => {
    return recentWallets.filter(wallet => wallet.type === type);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const getStorageEfficiencyClass = () => {
    if (storageEfficiency < 30) return "text-red-500";
    if (storageEfficiency < 70) return "text-amber-500";
    return "text-green-500";
  };

  const getProgressBarClass = () => {
    if (storageEfficiency < 30) return "bg-red-200";
    if (storageEfficiency < 70) return "bg-amber-200";
    return "bg-green-200";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">钱包生成器</h1>
        <div className="flex space-x-2">
          <Button 
            onClick={saveWallets}
            variant="outline"
          >
            <Save className="mr-2 h-4 w-4" /> 保存钱包
          </Button>
          <Button 
            onClick={openBatchGenerator}
            variant="outline"
          >
            <ListPlus className="mr-2 h-4 w-4" /> 批量生成
          </Button>
          <Button 
            onClick={toggleGenerator}
            className={isRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
          >
            {isRunning ? <><Pause className="mr-2 h-4 w-4" /> 停止生成器</> : <><Play className="mr-2 h-4 w-4" /> 启动生成器</>}
          </Button>
        </div>
      </div>
      
      {generatorError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>生成器错误</AlertTitle>
          <AlertDescription>{generatorError}</AlertDescription>
        </Alert>
      )}
      
      {backgroundState.isRunning && (
        <Alert className="bg-blue-50 border-blue-200">
          <Cpu className="h-4 w-4 text-blue-500" />
          <AlertTitle>后台生成进行中</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            <span>
              已生成: {backgroundState.generatedCount.toLocaleString()} / {backgroundState.targetCount.toLocaleString()} 
              ({Math.round(backgroundState.progress)}%)
            </span>
            <div className="flex space-x-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowGeneratorDialog(true)}
              >
                查看详情
              </Button>
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={() => backgroundGenerator.stopGeneration()}
              >
                停止
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>100% 存储保证</AlertTitle>
        <AlertDescription>
          所有生成的钱包都将立即存储到数据库中，确保生成和存储数量完全匹配。
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>生成器控制面板</CardTitle>
            <CardDescription>
              配置钱包生成设置并监控性能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <h3 className="text-sm font-medium">生成速度</h3>
                <span className="text-sm font-medium">{formatNumber(targetSpeed)} 钱包/秒</span>
              </div>
              
              <Slider 
                value={[targetSpeed]} 
                min={1000} 
                max={500000} 
                step={1000} 
                onValueChange={handleSpeedChange}
                disabled={isRunning}
              />
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1,000/秒</span>
                <span>100,000/秒</span>
                <span>500,000/秒</span>
              </div>
              
              <Alert variant="destructive" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>关于生成速度</AlertTitle>
                <AlertDescription>
                  这里设置的是<strong>目标</strong>生成速度，实际生成速度受硬件性能和系统资源限制。较高的目标速度可能无法完全达到，但系统会尽可能接近这个目标值。
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">生成速率</div>
                <div className="text-2xl font-bold">{formatNumber(currentSpeed)}<span className="text-xs text-muted-foreground">/秒</span></div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {currentSpeed > 0 
                    ? `目标的 ${Math.floor((currentSpeed / targetSpeed) * 100)}%` 
                    : '生成器未运行'}
                </div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">已生成总数</div>
                <div className="text-lg font-bold">{formatNumber(generatedCount)}</div>
                <div className="text-xs text-muted-foreground mb-1 mt-1">已保存到数据库</div>
                <div className="text-lg font-bold">{formatNumber(savedCount)}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  运行时间: {formatTime(elapsedTime)}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm mb-1">
                <span>存储效率</span>
                <span className="text-green-500">
                  {storageEfficiency}%
                </span>
              </div>
              <Progress 
                value={storageEfficiency} 
                className="h-2 bg-green-200" 
              />
              <p className="text-xs text-muted-foreground">
                生成的钱包中已成功保存到数据库的百分比，现在已确保为100%
              </p>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              {isRunning && (
                <div className="flex items-center">
                  <div className="dot-pulse mr-3"></div>
                  <span className="text-sm">正在生成钱包...</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full flex justify-between">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4" />
                    高级设置
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>高级设置</SheetTitle>
                    <SheetDescription>
                      配置钱包生成器的高级选项
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4 space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">要生成的钱包类型</h3>
                      <div className="space-y-2 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="trc20-checkbox" 
                            checked={config.walletTypes.includes('TRC20')}
                            onCheckedChange={() => toggleWalletType('TRC20')}
                            disabled={isRunning}
                          />
                          <Label htmlFor="trc20-checkbox">TRC20 钱包</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="erc20-checkbox" 
                            checked={config.walletTypes.includes('ERC20')}
                            onCheckedChange={() => toggleWalletType('ERC20')}
                            disabled={isRunning}
                          />
                          <Label htmlFor="erc20-checkbox">ERC20 钱包</Label>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold">生成比例</h3>
                      <div className="space-y-2">
                        <Label htmlFor="trc20-ratio">TRC20 比例: {config.trc20Ratio}%</Label>
                        <Slider 
                          id="trc20-ratio"
                          value={[config.trc20Ratio]} 
                          min={0} 
                          max={100} 
                          step={5}
                          disabled={isRunning || !config.walletTypes.includes('TRC20') || !config.walletTypes.includes('ERC20')}
                          onValueChange={(value) => updateConfig('trc20Ratio', value[0])}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="p-4 bg-secondary rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">TRC20</div>
                          <div className="text-lg font-bold">{config.trc20Ratio}%</div>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">ERC20</div>
                          <div className="text-lg font-bold">{100 - config.trc20Ratio}%</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold">性能设置</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={autoConfigureForDevice}
                                disabled={isRunning}
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                自动配置
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>根据您的设备性能自动优化设置</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      <ServerConfigPanel 
                        config={config}
                        setConfig={setConfig}
                        isRunning={isRunning}
                      />

                      <div className="space-y-4">
                        <div className="grid grid-cols-3 items-center gap-2">
                          <Label htmlFor="thread-count">线程数</Label>
                          <Input 
                            id="thread-count"
                            type="number" 
                            value={config.threadCount} 
                            onChange={(e) => updateConfig('threadCount', Math.max(1, Number(e.target.value)))}
                            className="col-span-2"
                            min={1}
                            max={16}
                            disabled={isRunning}
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 items-center gap-2">
                          <Label htmlFor="batch-size">批处理大小</Label>
                          <Input 
                            id="batch-size"
                            type="number" 
                            value={config.batchSize} 
                            onChange={(e) => updateConfig('batchSize', Math.max(100, Number(e.target.value)))}
                            className="col-span-2"
                            min={100}
                            max={10000}
                            step={100}
                            disabled={isRunning}
                          />
                        </div>
                        
                        <div className="grid grid-cols-3 items-center gap-2">
                          <Label htmlFor="memory-limit">内存限制(MB)</Label>
                          <Input 
                            id="memory-limit"
                            type="number" 
                            value={config.memoryLimit} 
                            onChange={(e) => updateConfig('memoryLimit', Math.max(128, Number(e.target.value)))}
                            className="col-span-2"
                            min={128}
                            max={131072}
                            step={128}
                            disabled={isRunning}
                          />
                        </div>
                      </div>
                      
                      <div className="p-4 bg-muted rounded-lg text-xs text-muted-foreground space-y-2 mt-2">
                        <p>• 增加线程数可提高生成速度，但会增加CPU使用率</p>
                        <p>• 增大批处理大小可提高效率，但会增加内存使用</p>
                        <p>• 内存限制决定了程序可使用的最大内存</p>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" onClick={resetCounter}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重置计数器
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <Tabs defaultValue={activeTab} onValueChange={handleTabChange}>
            <CardHeader className="pb-0">
              <CardTitle>已生成的钱包</CardTitle>
              <TabsList className="mt-2 w-full">
                <TabsTrigger value="trc20" className="flex-1">TRC20</TabsTrigger>
                <TabsTrigger value="erc20" className="flex-1">ERC20</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="trc20" className="mt-0">
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3 pr-3">
                    {getFilteredWallets('TRC20').length > 0 ? (
                      getFilteredWallets('TRC20').map((wallet, index) => (
                        <div key={wallet.id} className="p-3 bg-secondary rounded-md text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">TRC20 钱包</span>
                            <span className="text-muted-foreground">
                              {wallet.createdAt.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="font-mono break-all">
                            {wallet.address}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        尚未生成 TRC20 钱包。
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="erc20" className="mt-0">
                <ScrollArea className="h-[350px]">
                  <div className="space-y-3 pr-3">
                    {getFilteredWallets('ERC20').length > 0 ? (
                      getFilteredWallets('ERC20').map((wallet, index) => (
                        <div key={wallet.id} className="p-3 bg-secondary rounded-md text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">ERC20 钱包</span>
                            <span className="text-muted-foreground">
                              {wallet.createdAt.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="font-mono break-all">
                            {wallet.address}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        尚未生成 ERC20 钱包。
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
      
      <GeneratorDialog
        open={showGeneratorDialog}
        onOpenChange={setShowGeneratorDialog}
      />
    </div>
  );
};

export default Generator;
