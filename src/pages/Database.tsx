
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
        title: "Success",
        description: "Wallets successfully saved to database.",
      });
    } catch (error) {
      console.error('Failed to save wallets', error);
      toast({
        title: "Error",
        description: "Failed to save wallets to database.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearDatabase = async () => {
    if (window.confirm('Are you sure you want to clear the database? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        await walletDB.clearDatabase();
        toast({
          title: "Database Cleared",
          description: "All wallet records have been removed from the database.",
        });
      } catch (error) {
        console.error('Failed to clear database', error);
        toast({
          title: "Error",
          description: "Failed to clear the database.",
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
        <h1 className="text-2xl font-bold">Database Management</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleManualSave} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Manual Save
          </Button>
          <Button variant="destructive" onClick={handleClearDatabase} disabled={isLoading}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Database
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Database Statistics</CardTitle>
            <CardDescription>
              Current storage metrics and performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Total Stored</div>
                <div className="text-2xl font-bold">{formatNumber(dbStats.totalStored)}</div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">TRC20 Wallets</div>
                <div className="text-2xl font-bold">{formatNumber(dbStats.trc20Count)}</div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">ERC20 Wallets</div>
                <div className="text-2xl font-bold">{formatNumber(dbStats.erc20Count)}</div>
              </div>
              
              <div className="p-4 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Database Size</div>
                <div className="text-2xl font-bold">{dbStats.databaseSize}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Storage Usage</span>
                  <span>25%</span>
                </div>
                <Progress value={25} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Write Performance</span>
                  <span>{formatNumber(dbStats.writeSpeed)}/sec</span>
                </div>
                <Progress value={80} className="h-2" />
              </div>
            </div>
            
            <div className="pt-2">
              <h3 className="text-sm font-medium mb-3">Database Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-secondary rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Last Write Operation</div>
                  <div className="text-sm">{formatTime(dbStats.lastWrite)}</div>
                </div>
                <div className="p-3 bg-secondary rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Write Speed</div>
                  <div className="text-sm">{formatNumber(dbStats.writeSpeed)} wallets/second</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Distribution</CardTitle>
            <CardDescription>
              Wallet type distribution in database
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="h-60 flex items-center justify-center">
              {dbStats.totalStored > 0 ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold">{dbStats.totalStored.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total Wallets</div>
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
                  <p>No data available</p>
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
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Stats
          </Button>
        </div>
        
        <TabsContent value="performance" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Database Performance</CardTitle>
              <CardDescription>
                Optimized for high-throughput wallet storage and fast queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <HardDrive className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">Storage Engine</div>
                    </div>
                    <div className="text-xs text-muted-foreground">High-Performance Local Storage</div>
                    <div className="mt-2 text-sm">Optimized for high-volume writes</div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <BarChart4 className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">Query Performance</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Indexed Search</div>
                    <div className="mt-2 text-sm">Sub-millisecond query response</div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center mb-2">
                      <DatabaseIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                      <div className="text-sm font-medium">Data Compression</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Optimized Storage</div>
                    <div className="mt-2 text-sm">Efficient data serialization</div>
                  </div>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Local Storage Only</AlertTitle>
                  <AlertDescription>
                    All wallet data is stored locally on your device. No data is sent to external servers.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Security Information</CardTitle>
              <CardDescription>
                Data protection and privacy measures
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning: Private Keys Storage</AlertTitle>
                  <AlertDescription>
                    Private keys are stored in plaintext for demonstration purposes. In a production environment, encrypted storage with proper key management should be implemented.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="text-sm font-medium mb-2">Data Isolation</div>
                    <div className="text-xs">
                      All generated wallet data is stored locally and isolated from external networks. No data is synced to cloud services or external servers.
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="text-sm font-medium mb-2">Secure Random Generation</div>
                    <div className="text-xs">
                      Wallet generation uses cryptographically secure random number generators to ensure private keys cannot be predicted or reproduced.
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-secondary rounded-lg mt-4">
                  <div className="text-sm font-medium mb-2">Security Recommendations</div>
                  <ul className="text-xs space-y-2">
                    <li>• Regularly backup your wallet database to prevent data loss</li>
                    <li>• Store backups in secure, encrypted storage</li>
                    <li>• Consider implementing additional encryption for private key storage</li>
                    <li>• For production use, consider hardware security modules (HSMs)</li>
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
