
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Cpu, Server, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GeneratorConfig } from '@/lib/types';
import { walletGenerator } from '@/lib/walletGenerator';
import { useToast } from '@/hooks/use-toast';

interface ServerConfigPanelProps {
  config: GeneratorConfig;
  setConfig: (config: GeneratorConfig) => void;
  isRunning: boolean;
}

const ServerConfigPanel: React.FC<ServerConfigPanelProps> = ({ 
  config, 
  setConfig, 
  isRunning 
}) => {
  const { toast } = useToast();
  const [manualCores, setManualCores] = useState<number>(
    typeof window !== 'undefined' && window.SERVER_CPU_CORES ? Number(window.SERVER_CPU_CORES) : (
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 16
    )
  );
  const [manualMemory, setManualMemory] = useState<number>(
    typeof window !== 'undefined' && window.SERVER_MEMORY_MB ? Number(window.SERVER_MEMORY_MB) : Math.max(2048, config.memoryLimit)
  );

  // 组件挂载时检查环境变量
  useEffect(() => {
    // 获取服务器环境变量（如果通过Docker设置）
    if (typeof window !== 'undefined') {
      // 尝试从window对象获取服务器信息（如果通过Docker设置）
      if ((window as any).SERVER_CPU_CORES) {
        setManualCores(Number((window as any).SERVER_CPU_CORES));
      }
      
      if ((window as any).SERVER_MEMORY_MB) {
        setManualMemory(Number((window as any).SERVER_MEMORY_MB));
      }
    }
  }, []);
  
  const updateConfig = (key: keyof GeneratorConfig, value: any) => {
    if (!isRunning) {
      const newConfig = { ...config, [key]: value };
      setConfig(newConfig);
      walletGenerator.setConfig(newConfig);
    } else {
      toast({
        title: "无法更改配置",
        description: "请先停止生成器，然后再更改配置。",
        variant: "destructive",
      });
    }
  };
  
  const applyServerConfiguration = () => {
    if (!isRunning) {
      // 根据服务器规格优化配置
      const optimizedThreads = Math.max(2, Math.min(8, Math.floor(manualCores / 2)));
      const optimizedBatchSize = manualCores >= 16 ? 500 : manualCores >= 8 ? 200 : 100;
      const optimizedMemoryLimit = manualMemory;
      
      const newConfig = {
        ...config,
        threadCount: optimizedThreads,
        batchSize: optimizedBatchSize,
        memoryLimit: optimizedMemoryLimit
      };
      
      setConfig(newConfig);
      walletGenerator.setConfig(newConfig);
      
      toast({
        title: "服务器配置已应用",
        description: `已根据服务器规格优化配置：${manualCores}核心，${manualMemory}MB内存`,
      });
    }
  };
  
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>服务器资源配置</CardTitle>
        <CardDescription>
          手动配置服务器硬件资源以优化生成性能
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            检测到浏览器报告的CPU核心数为: {typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : "未知"}。
            如果您在服务器上运行，可以手动设置实际的服务器资源。
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              <Label htmlFor="cpu-cores">服务器CPU核心数</Label>
            </div>
            <Input
              id="cpu-cores"
              type="number"
              value={manualCores}
              onChange={(e) => setManualCores(Number(e.target.value))}
              min={1}
              max={128}
              disabled={isRunning}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <Label htmlFor="server-memory">服务器内存 (MB)</Label>
            </div>
            <Input
              id="server-memory"
              type="number"
              value={manualMemory}
              onChange={(e) => setManualMemory(Number(e.target.value))}
              min={1024}
              max={131072}
              step={1024}
              disabled={isRunning}
            />
          </div>
        </div>
        
        <div className="pt-2">
          <Button 
            onClick={applyServerConfiguration}
            disabled={isRunning}
            className="w-full"
          >
            <Server className="mr-2 h-4 w-4" />
            应用服务器配置
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <p>• 推荐线程数: {Math.max(2, Math.min(8, Math.floor(manualCores / 2)))}</p>
          <p>• 推荐批处理大小: {manualCores >= 16 ? 500 : manualCores >= 8 ? 200 : 100}</p>
          <p>• 推荐内存限制: {Math.min(manualMemory, 8192)}MB</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerConfigPanel;
