
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HardDrive, DatabaseIcon, Zap } from 'lucide-react';

interface DatabaseStatsProps {
  dbStats: {
    totalStored: number;
    trc20Count: number;
    erc20Count: number;
    databaseSize: string;
    lastWrite: Date | null;
    writeSpeed: number;
  };
  storageEfficiency: number;
  compressionEnabled: boolean;
  toggleCompression: () => void;
  sizeEstimates: Array<{ count: number; size: string }>;
  isCalculating: boolean;
}

const DatabaseStats: React.FC<DatabaseStatsProps> = ({
  dbStats,
  storageEfficiency,
  compressionEnabled,
  toggleCompression,
  sizeEstimates,
  isCalculating
}) => {
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatTime = (date: Date | null): string => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };
  
  return (
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
  );
};

export default DatabaseStats;
