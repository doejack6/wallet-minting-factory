
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
  BarChart4
} from 'lucide-react';
import { walletDB } from '@/lib/database';
import { walletGenerator } from '@/lib/walletGenerator';
import { useToast } from '@/components/ui/use-toast';

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
  
  // Update stats every second
  useEffect(() => {
    const updateStats = () => {
      setDbStats({
        totalStored: walletDB.getTotalCount(),
        trc20Count: walletDB.getTypeCount('TRC20'),
        erc20Count: walletDB.getTypeCount('ERC20'),
        databaseSize: walletDB.getDatabaseSize(),
        lastWrite: walletDB.getLastWrite(),
        writeSpeed: walletDB.getWriteSpeed(),
      });
    };
    
    // Initial update
    updateStats();
    
    // Set interval
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
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
            </div>
            
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
            <TabsTrigger value="security">安全</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm">
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
