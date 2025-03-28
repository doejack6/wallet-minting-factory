
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Play, Pause, Settings, RefreshCw, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { walletGenerator } from '@/lib/walletGenerator';
import { walletDB } from '@/lib/database';
import { useToast } from '@/components/ui/use-toast';

const Generator: React.FC = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [targetSpeed, setTargetSpeed] = useState(100000);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [autoSave, setAutoSave] = useState(true);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [recentWallets, setRecentWallets] = useState<any[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  
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
    const interval = setInterval(() => {
      if (walletGenerator.isRunning()) {
        setElapsedTime(walletGenerator.getUptime());
        setRecentWallets(walletGenerator.getLastBatch(10));
        
        // Auto-save to database if enabled
        if (autoSave) {
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
      }
    }, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, [autoSave, toast]);
  
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
            
            <div className="flex items-center space-x-2">
              <Switch id="autosave" checked={autoSave} onCheckedChange={setAutoSave} />
              <Label htmlFor="autosave">自动保存到数据库</Label>
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
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                高级设置
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                重置计数器
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <Tabs defaultValue="trc20">
            <CardHeader className="pb-0">
              <CardTitle>已生成的钱包</CardTitle>
              <TabsList className="mt-2">
                <TabsTrigger value="trc20">TRC20</TabsTrigger>
                <TabsTrigger value="erc20">ERC20</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-6">
              <TabsContent value="trc20" className="mt-0">
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {recentWallets
                    .filter(wallet => wallet.type === 'TRC20')
                    .map((wallet, index) => (
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
                    ))}
                  
                  {recentWallets.filter(wallet => wallet.type === 'TRC20').length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      尚未生成 TRC20 钱包。
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="erc20" className="mt-0">
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {recentWallets
                    .filter(wallet => wallet.type === 'ERC20')
                    .map((wallet, index) => (
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
                    ))}
                  
                  {recentWallets.filter(wallet => wallet.type === 'ERC20').length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      尚未生成 ERC20 钱包。
                    </div>
                  )}
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Generator;
