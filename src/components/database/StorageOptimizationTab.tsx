
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AlertTriangle, HardDrive, Settings2, DatabaseIcon } from 'lucide-react';

interface StorageOptimizationTabProps {
  optimizationLevel: number;
  setOptimizationLevel: (value: number) => void;
  compressionEnabled: boolean;
  toggleCompression: () => void;
  storageEfficiency: number;
}

const StorageOptimizationTab: React.FC<StorageOptimizationTabProps> = ({
  optimizationLevel,
  setOptimizationLevel,
  compressionEnabled,
  toggleCompression,
  storageEfficiency,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>存储优化</CardTitle>
        <CardDescription>
          优化钱包存储性能和效率
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">存储优化级别</h3>
            <div className="space-y-2">
              <Label htmlFor="optimization-level">优化级别: {optimizationLevel}</Label>
              <Slider 
                id="optimization-level"
                value={[optimizationLevel]} 
                min={1} 
                max={10} 
                step={1}
                onValueChange={(value) => setOptimizationLevel(value[0])}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>低 (更快生成)</span>
                <span>平衡</span>
                <span>高 (更可靠存储)</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mt-2">
              优化级别决定了钱包生成速度和数据库存储可靠性之间的平衡。更高的优化级别会降低生成速度但提高存储可靠性。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center mb-2">
                <HardDrive className="h-5 w-5 mr-2 text-muted-foreground" />
                <div className="text-sm font-medium">数据批处理</div>
              </div>
              <div className="text-xs text-muted-foreground">大小: 1000</div>
              <div className="mt-2 text-sm">优化大批量数据写入</div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center mb-2">
                <Settings2 className="h-5 w-5 mr-2 text-muted-foreground" />
                <div className="text-sm font-medium">同步频率</div>
              </div>
              <div className="text-xs text-muted-foreground">每100毫秒</div>
              <div className="mt-2 text-sm">更频繁的数据库同步</div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <div className="flex items-center mb-2">
                <DatabaseIcon className="h-5 w-5 mr-2 text-muted-foreground" />
                <div className="text-sm font-medium">去重处理</div>
              </div>
              <div className="text-xs text-muted-foreground">已启用</div>
              <div className="mt-2 text-sm">防止重复钱包存储</div>
            </div>
          </div>
          
          <div className="p-4 border border-dashed border-border rounded-lg">
            <h3 className="text-sm font-semibold mb-2">数据压缩</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">当前状态: <span className={compressionEnabled ? "text-green-500" : "text-muted-foreground"}>
                  {compressionEnabled ? "已启用 (节省空间约60%)" : "已禁用"}
                </span></p>
                <p className="text-xs text-muted-foreground mt-1">
                  数据压缩可以显著减少存储空间，支持更大规模的钱包生成与存储
                </p>
              </div>
              <Switch 
                checked={compressionEnabled}
                onCheckedChange={toggleCompression}
              />
            </div>
          </div>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <Settings2 className="mr-2 h-4 w-4" />
                高级存储设置
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>高级存储设置</SheetTitle>
                <SheetDescription>
                  配置钱包存储的高级选项
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-6">
                <p className="text-sm text-muted-foreground">
                  这些高级设置可以帮助您平衡系统性能和数据存储可靠性。调整这些设置可能会影响系统整体性能。
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>数据库写入延迟</Label>
                    <Select defaultValue="low">
                      <SelectTrigger>
                        <SelectValue placeholder="选择延迟级别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="very-low">极低 (100ms)</SelectItem>
                        <SelectItem value="low">低 (200ms)</SelectItem>
                        <SelectItem value="medium">中等 (500ms)</SelectItem>
                        <SelectItem value="high">高 (1000ms)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>批处理大小</Label>
                    <Select defaultValue="1000">
                      <SelectTrigger>
                        <SelectValue placeholder="选择批处理大小" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="500">小 (500)</SelectItem>
                        <SelectItem value="1000">中 (1000)</SelectItem>
                        <SelectItem value="2000">大 (2000)</SelectItem>
                        <SelectItem value="5000">极大 (5000)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>存储效率</AlertTitle>
            <AlertDescription>
              当前存储效率为 {storageEfficiency}%。
              {storageEfficiency < 30 ? 
                " 建议降低生成速度或提高存储优化级别以提高存储效率。" : 
                storageEfficiency < 70 ? 
                  " 存储效率尚可，但仍有优化空间。" : 
                  " 存储效率良好，系统运行正常。"}
              {!compressionEnabled && " 启用数据压缩可进一步提高存储效率。"}
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

export default StorageOptimizationTab;
