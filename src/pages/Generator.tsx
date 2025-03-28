
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Play, Pause, Settings, RefreshCw, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { walletGenerator } from '@/lib/walletGenerator';
import { walletDB } from '@/lib/database';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';

const Generator: React.FC = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [targetSpeed, setTargetSpeed] = useState(100000);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [saveFrequency, setSaveFrequency] = useState<number>(1000); // 保存频率，默认1000ms（1秒）
  const [generatedCount, setGeneratedCount] = useState(0);
  const [recentWallets, setRecentWallets] = useState<any[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeTab, setActiveTab] = useState('trc20');
  
  // Initialize and set up event listeners
  useEffect(() => {
    // Update state from wallet generator
    setIsRunning(walletGenerator.isRunning());
    
    // Set up progress callback
    walletGenerator.setOnProgress((stats) => {
      setCurrentSpeed(stats.speed);
      setGeneratedCount(stats.count);
    });
    
    // Update UI every second
    const uiUpdateInterval = setInterval(() => {
      if (walletGenerator.isRunning()) {
        setElapsedTime(walletGenerator.getUptime());
        setRecentWallets(walletGenerator.getLastBatch(20));
      }
    }, 1000);
    
    // Set up separate interval for database saving based on saveFrequency
    const dbSaveInterval = setInterval(() => {
      if (walletGenerator.isRunning() && autoSave) {
        walletDB.storeWallets(walletGenerator.getLastBatch(1000))
          .catch(error => {
            console.error('Failed to save wallets to database', error);
            toast({
              title: "Database Error",
              description: "Failed to save wallets to database.",
              variant: "destructive",
            });
          });
      }
    }, saveFrequency);
    
    return () => {
      clearInterval(uiUpdateInterval);
      clearInterval(dbSaveInterval);
    };
  }, [autoSave, toast, saveFrequency]);
  
  const toggleGenerator = () => {
    if (isRunning) {
      walletGenerator.stop();
      setIsRunning(false);
      toast({
        title: "生成器已停止",
        description: "钱包生成进程已暂停。",
      });
    } else {
      walletGenerator.setTargetSpeed(targetSpeed);
      walletGenerator.start();
      setIsRunning(true);
      toast({
        title: "生成器已启动",
        description: "钱包生成进程已开始。",
      });
    }
  };
  
  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0];
    setTargetSpeed(newSpeed);
    walletGenerator.setTargetSpeed(newSpeed);
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
      setGeneratedCount(0);
      setElapsedTime(0);
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

  // 过滤指定类型的钱包
  const getFilteredWallets = (type: 'TRC20' | 'ERC20') => {
    return recentWallets.filter(wallet => wallet.type.toUpperCase() === type.toUpperCase());
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">钱包生成器</h1>
        <Button 
          onClick={toggleGenerator}
          className={isRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
        >
          {isRunning ? <><Pause className="mr-2 h-4 w-4" /> 停止生成器</> : <><Play className="mr-2 h-4 w-4" /> 启动生成器</>}
        </Button>
      </div>
      
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>离线模式</AlertTitle>
        <AlertDescription>
          所有钱包均在本地生成，不会发送到任何外部服务器。私钥安全地存储在本地数据库中。
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
                min={10000} 
                max={1000000} 
                step={10000} 
                onValueChange={handleSpeedChange}
                disabled={isRunning}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10,000/秒</span>
                <span>100,000/秒</span>
                <span>1,000,000/秒</span>
              </div>
            </div>
            
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <Switch id="autosave" checked={autoSave} onCheckedChange={setAutoSave} />
                <Label htmlFor="autosave">自动保存到数据库</Label>
              </div>
              
              {autoSave && (
                <div className="ml-7">
                  <Label htmlFor="save-frequency" className="text-sm mb-2 block">保存频率</Label>
                  <Select
                    value={saveFrequency.toString()}
                    onValueChange={(value) => setSaveFrequency(Number(value))}
                    disabled={isRunning}
                  >
                    <SelectTrigger id="save-frequency" className="w-full">
                      <SelectValue placeholder="选择保存频率" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">非常快 (100毫秒)</SelectItem>
                      <SelectItem value="500">快速 (500毫秒)</SelectItem>
                      <SelectItem value="1000">正常 (1秒)</SelectItem>
                      <SelectItem value="5000">慢速 (5秒)</SelectItem>
                      <SelectItem value="10000">很慢 (10秒)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    频率越高，对系统性能要求越高。请根据您的硬件情况选择合适的频率。
                  </p>
                </div>
              )}
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
                <div className="text-2xl font-bold">{formatNumber(generatedCount)}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  运行时间: {formatTime(elapsedTime)}
                </div>
              </div>
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
                  <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">生成比例</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-secondary rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">TRC20</div>
                          <div className="text-lg font-bold">50%</div>
                        </div>
                        <div className="p-4 bg-secondary rounded-lg">
                          <div className="text-xs text-muted-foreground mb-1">ERC20</div>
                          <div className="text-lg font-bold">50%</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">性能设置</h3>
                      <div className="p-4 bg-secondary rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">线程数</span>
                          <span className="text-xs font-medium">4</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">批处理大小</span>
                          <span className="text-xs font-medium">1000</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs">内存限制</span>
                          <span className="text-xs font-medium">512MB</span>
                        </div>
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
          <Tabs defaultValue="trc20" onValueChange={handleTabChange}>
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
                        <div key={index} className="p-3 bg-secondary rounded-md text-xs">
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
                        <div key={index} className="p-3 bg-secondary rounded-md text-xs">
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
    </div>
  );
};

export default Generator;
