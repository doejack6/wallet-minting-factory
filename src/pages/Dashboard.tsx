
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RefreshCw, Database, Cpu, Activity } from 'lucide-react';
import { GeneratorStats, DatabaseStats, StatusInfo } from '@/lib/types';
import { walletGenerator } from '@/lib/walletGenerator';
import { walletDB } from '@/lib/database';
import { useToast } from '@/components/ui/use-toast';

const Dashboard: React.FC = () => {
  const { toast } = useToast();
  const [generatorStats, setGeneratorStats] = useState<GeneratorStats>({
    totalGenerated: 0,
    trc20Count: 0,
    erc20Count: 0,
    generationSpeed: 0,
    uptime: 0,
    lastGenerated: null,
  });
  
  const [dbStats, setDbStats] = useState<DatabaseStats>({
    totalStored: 0,
    databaseSize: '0 bytes',
    lastWrite: null,
    writeSpeed: 0,
  });
  
  const [status, setStatus] = useState<StatusInfo>({
    running: false,
    currentSpeed: 0,
    targetSpeed: 100000,
    threads: 8,
    memoryUsage: '0 MB',
    cpuUsage: 0,
  });
  
  // Update stats every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (walletGenerator.isRunning()) {
        // Update generator stats
        setGeneratorStats({
          totalGenerated: walletGenerator.getTotalGenerated(),
          trc20Count: Math.floor(walletGenerator.getTotalGenerated() / 2), // Assuming 50/50 split
          erc20Count: Math.floor(walletGenerator.getTotalGenerated() / 2),
          generationSpeed: walletGenerator.getCurrentSpeed(),
          uptime: walletGenerator.getUptime(),
          lastGenerated: new Date(),
        });
        
        // Update status
        setStatus(prev => ({
          ...prev,
          running: true,
          currentSpeed: walletGenerator.getCurrentSpeed(),
          memoryUsage: `${Math.floor(Math.random() * 1000 + 500)} MB`, // Simulate memory usage
          cpuUsage: Math.floor(Math.random() * 60 + 30), // Simulate CPU usage
        }));
        
        // Simulate database syncing
        walletDB.storeWallets(walletGenerator.getLastBatch(1000))
          .then(() => {
            setDbStats({
              totalStored: walletDB.getTotalCount(),
              databaseSize: walletDB.getDatabaseSize(),
              lastWrite: walletDB.getLastWrite(),
              writeSpeed: walletDB.getWriteSpeed(),
            });
          });
      } else {
        setStatus(prev => ({
          ...prev,
          running: false,
          currentSpeed: 0,
          cpuUsage: Math.floor(Math.random() * 10),
        }));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const toggleGenerator = () => {
    if (walletGenerator.isRunning()) {
      walletGenerator.stop();
      toast({
        title: "生成器已停止",
        description: "钱包生成进程已暂停。",
      });
    } else {
      walletGenerator.start();
      toast({
        title: "生成器已启动",
        description: "钱包生成进程已开始。",
      });
    }
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
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <Button 
          onClick={toggleGenerator}
          className={status.running ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
        >
          {status.running ? <><Pause className="mr-2 h-4 w-4" /> 停止生成器</> : <><Play className="mr-2 h-4 w-4" /> 启动生成器</>}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Activity className="mr-2 h-5 w-5 text-crypto-green" />
              生成状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">状态</span>
                <span className={`px-2 py-1 rounded text-xs ${status.running ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {status.running ? '运行中' : '已停止'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">当前速度</span>
                <span className="font-medium">{formatNumber(status.currentSpeed)}/秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">目标速度</span>
                <span className="font-medium">{formatNumber(status.targetSpeed)}/秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU使用率</span>
                <span className="font-medium">{status.cpuUsage}%</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>性能</span>
                  <span>{Math.min(100, Math.floor((status.currentSpeed / status.targetSpeed) * 100))}%</span>
                </div>
                <Progress value={Math.min(100, Math.floor((status.currentSpeed / status.targetSpeed) * 100))} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Cpu className="mr-2 h-5 w-5 text-crypto-purple" />
              生成器统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">总计生成</span>
                <span className="font-medium">{formatNumber(generatorStats.totalGenerated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TRC20钱包</span>
                <span className="font-medium">{formatNumber(generatorStats.trc20Count)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ERC20钱包</span>
                <span className="font-medium">{formatNumber(generatorStats.erc20Count)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">运行时间</span>
                <span className="font-medium">{formatTime(generatorStats.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最近生成</span>
                <span className="font-medium">
                  {generatorStats.lastGenerated 
                    ? generatorStats.lastGenerated.toLocaleTimeString() 
                    : '无'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="mr-2 h-5 w-5 text-crypto-blue" />
              数据库统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">已存储总数</span>
                <span className="font-medium">{formatNumber(dbStats.totalStored)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">数据库大小</span>
                <span className="font-medium">{dbStats.databaseSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">写入速度</span>
                <span className="font-medium">{formatNumber(dbStats.writeSpeed)}/秒</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最近写入</span>
                <span className="font-medium">
                  {dbStats.lastWrite 
                    ? dbStats.lastWrite.toLocaleTimeString() 
                    : '无'}
                </span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>存储效率</span>
                  <span>{Math.min(100, Math.floor((dbStats.totalStored / (generatorStats.totalGenerated || 1)) * 100))}%</span>
                </div>
                <Progress 
                  value={Math.min(100, Math.floor((dbStats.totalStored / (generatorStats.totalGenerated || 1)) * 100))} 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Tabs defaultValue="recent">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="recent">最近生成的钱包</TabsTrigger>
              <TabsTrigger value="status">系统状态</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
          
          <TabsContent value="recent" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>最近生成的钱包</CardTitle>
                <CardDescription>
                  以下显示最近生成的5个钱包地址
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {walletGenerator.getLastBatch(5).map((wallet, index) => (
                    <div key={index} className="p-3 bg-secondary rounded-md">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{wallet.type}</span>
                        <span className="text-xs text-muted-foreground">
                          {wallet.createdAt.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm font-mono break-all">
                        {wallet.address}
                      </div>
                    </div>
                  ))}
                  
                  {walletGenerator.getLastBatch(5).length === 0 && (
                    <div className="text-center py-6 text-muted-foreground">
                      尚未生成钱包。启动生成器以查看结果。
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="status" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>系统状态</CardTitle>
                <CardDescription>
                  当前性能指标和系统资源
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">CPU使用率</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>核心利用率</span>
                        <span>{status.cpuUsage}%</span>
                      </div>
                      <Progress value={status.cpuUsage} className="h-2" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">内存使用率</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>内存分配</span>
                        <span>{status.memoryUsage}</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">线程分配</h3>
                    <div className="grid grid-cols-8 gap-2">
                      {Array.from({ length: status.threads }).map((_, i) => (
                        <div 
                          key={i}
                          className={`h-6 rounded-sm ${i < (status.threads * status.cpuUsage / 100) 
                            ? 'bg-primary animate-pulse-slow' 
                            : 'bg-secondary'}`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <h3 className="text-sm font-medium mb-2">系统信息</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">数据库引擎</div>
                        <div className="text-sm">高性能本地数据库</div>
                      </div>
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">生成引擎</div>
                        <div className="text-sm">多线程加密技术</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
