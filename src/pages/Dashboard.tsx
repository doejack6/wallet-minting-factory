
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
        title: "Generator Stopped",
        description: "Wallet generation process has been paused.",
      });
    } else {
      walletGenerator.start();
      toast({
        title: "Generator Started",
        description: "Wallet generation process has begun.",
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
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button 
          onClick={toggleGenerator}
          className={status.running ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
        >
          {status.running ? <><Pause className="mr-2 h-4 w-4" /> Stop Generator</> : <><Play className="mr-2 h-4 w-4" /> Start Generator</>}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Activity className="mr-2 h-5 w-5 text-crypto-green" />
              Generation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <span className={`px-2 py-1 rounded text-xs ${status.running ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {status.running ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Speed</span>
                <span className="font-medium">{formatNumber(status.currentSpeed)}/sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Speed</span>
                <span className="font-medium">{formatNumber(status.targetSpeed)}/sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CPU Usage</span>
                <span className="font-medium">{status.cpuUsage}%</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Performance</span>
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
              Generator Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Generated</span>
                <span className="font-medium">{formatNumber(generatorStats.totalGenerated)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TRC20 Wallets</span>
                <span className="font-medium">{formatNumber(generatorStats.trc20Count)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ERC20 Wallets</span>
                <span className="font-medium">{formatNumber(generatorStats.erc20Count)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uptime</span>
                <span className="font-medium">{formatTime(generatorStats.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Generated</span>
                <span className="font-medium">
                  {generatorStats.lastGenerated 
                    ? generatorStats.lastGenerated.toLocaleTimeString() 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="stats-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Database className="mr-2 h-5 w-5 text-crypto-blue" />
              Database Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Stored</span>
                <span className="font-medium">{formatNumber(dbStats.totalStored)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Database Size</span>
                <span className="font-medium">{dbStats.databaseSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Write Speed</span>
                <span className="font-medium">{formatNumber(dbStats.writeSpeed)}/sec</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Write</span>
                <span className="font-medium">
                  {dbStats.lastWrite 
                    ? dbStats.lastWrite.toLocaleTimeString() 
                    : 'N/A'}
                </span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Storage Efficiency</span>
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
              <TabsTrigger value="recent">Recent Wallets</TabsTrigger>
              <TabsTrigger value="status">System Status</TabsTrigger>
            </TabsList>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          <TabsContent value="recent" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Recently Generated Wallets</CardTitle>
                <CardDescription>
                  The last 5 generated wallet addresses are shown below
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
                      No wallets generated yet. Start the generator to see results.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="status" className="mt-0">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Current performance metrics and system resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">CPU Usage</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Core Utilization</span>
                        <span>{status.cpuUsage}%</span>
                      </div>
                      <Progress value={status.cpuUsage} className="h-2" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Memory Usage</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>RAM Allocation</span>
                        <span>{status.memoryUsage}</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Thread Allocation</h3>
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
                    <h3 className="text-sm font-medium mb-2">System Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Database Engine</div>
                        <div className="text-sm">High-Performance Local DB</div>
                      </div>
                      <div className="p-3 bg-secondary rounded-md">
                        <div className="text-xs text-muted-foreground mb-1">Generation Engine</div>
                        <div className="text-sm">Multi-threaded Cryptography</div>
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
