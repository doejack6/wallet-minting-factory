
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, HardDrive, BarChart4, DatabaseIcon } from 'lucide-react';

const PerformanceTab: React.FC = () => {
  return (
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
  );
};

export default PerformanceTab;
