
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
        title: "Generator Stopped",
        description: "Wallet generation process has been paused.",
      });
    } else {
      walletGenerator.setTargetSpeed(targetSpeed);
      walletGenerator.start();
      setIsRunning(true);
      toast({
        title: "Generator Started",
        description: "Wallet generation process has begun.",
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
        <h1 className="text-2xl font-bold">Wallet Generator</h1>
        <Button 
          onClick={toggleGenerator}
          className={isRunning ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}
        >
          {isRunning ? <><Pause className="mr-2 h-4 w-4" /> Stop Generator</> : <><Play className="mr-2 h-4 w-4" /> Start Generator</>}
        </Button>
      </div>
      
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Offline Mode</AlertTitle>
        <AlertDescription>
          All wallets are generated locally and not sent to any external servers. Private keys are stored securely in your local database.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Generator Control Panel</CardTitle>
            <CardDescription>
              Configure wallet generation settings and monitor performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <h3 className="text-sm font-medium">Generation Speed</h3>
                <span className="text-sm font-medium">{formatNumber(targetSpeed)} wallets/sec</span>
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
                <span>10,000/sec</span>
                <span>100,000/sec</span>
                <span>1,000,000/sec</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="autosave" checked={autoSave} onCheckedChange={setAutoSave} />
              <Label htmlFor="autosave">Auto-save to Database</Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Generation Rate</div>
                <div className="text-2xl font-bold">{formatNumber(currentSpeed)}<span className="text-xs text-muted-foreground">/sec</span></div>
                <div className="mt-2 flex items-center text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {currentSpeed > 0 
                    ? `${Math.floor((currentSpeed / targetSpeed) * 100)}% of target` 
                    : 'Generator not running'}
                </div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total Generated</div>
                <div className="text-2xl font-bold">{formatNumber(generatedCount)}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Runtime: {formatTime(elapsedTime)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-2">
              {isRunning && (
                <div className="flex items-center">
                  <div className="dot-pulse mr-3"></div>
                  <span className="text-sm">Generating wallets...</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full flex justify-between">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Advanced Settings
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Counter
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        <Card>
          <Tabs defaultValue="trc20">
            <CardHeader className="pb-0">
              <CardTitle>Generated Wallets</CardTitle>
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
                          <span className="font-medium">TRC20 Wallet</span>
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
                      No TRC20 wallets generated yet.
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
                          <span className="font-medium">ERC20 Wallet</span>
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
                      No ERC20 wallets generated yet.
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
