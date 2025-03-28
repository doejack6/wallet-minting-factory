
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { backgroundGenerator, BackgroundGenState } from '@/lib/services/backgroundGeneratorService';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { walletGenerator } from '@/lib/walletGenerator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface GeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GeneratorDialog: React.FC<GeneratorDialogProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [count, setCount] = useState<number>(10000);
  const [backgroundState, setBackgroundState] = useState<BackgroundGenState>(backgroundGenerator.getState());
  const [useTRC20, setUseTRC20] = useState<boolean>(true);
  const [useERC20, setUseERC20] = useState<boolean>(true);
  const [trc20Ratio, setTrc20Ratio] = useState<number>(50);
  
  const isRunning = backgroundState.isRunning;
  const generatedCount = backgroundState.generatedCount;
  const progress = backgroundState.progress;
  const generationSpeed = backgroundState.speed;
  const error = backgroundState.error;
  
  useEffect(() => {
    // Subscribe to background generator state changes
    const unsubscribe = backgroundGenerator.subscribeTo(setBackgroundState);
    return unsubscribe;
  }, []);
  
  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setCount(value);
    }
  };
  
  const handleTrc20RatioChange = (values: number[]) => {
    setTrc20Ratio(values[0]);
  };
  
  const handleStart = () => {
    if (count <= 0) {
      toast({
        title: "请输入有效数量",
        description: "生成数量必须大于0。",
        variant: "destructive",
      });
      return;
    }
    
    if (!useTRC20 && !useERC20) {
      toast({
        title: "请选择钱包类型",
        description: "至少需要选择一种钱包类型。",
        variant: "destructive",
      });
      return;
    }
    
    const walletTypes = [];
    if (useTRC20) walletTypes.push('TRC20');
    if (useERC20) walletTypes.push('ERC20');
    
    try {
      backgroundGenerator.startGeneration(count, walletTypes, trc20Ratio);
      
      toast({
        title: "后台生成已启动",
        description: `将生成 ${count.toLocaleString()} 个钱包。您可以关闭此对话框，生成将在后台继续。`,
      });
    } catch (error) {
      console.error('Failed to start generation:', error);
      toast({
        title: "启动失败",
        description: "无法启动钱包生成器。",
        variant: "destructive",
      });
    }
  };
  
  const handleStop = () => {
    backgroundGenerator.stopGeneration();
    
    toast({
      title: "生成已停止",
      description: "钱包生成已停止。",
    });
  };
  
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };
  
  const calculateTimeRemaining = (): string => {
    if (!isRunning || generationSpeed <= 0) return '计算中...';
    
    const remaining = count - generatedCount;
    const seconds = Math.ceil(remaining / generationSpeed);
    
    if (seconds < 60) return `约${seconds}秒`;
    if (seconds < 3600) return `约${Math.ceil(seconds / 60)}分钟`;
    return `约${Math.ceil(seconds / 3600)}小时${Math.ceil((seconds % 3600) / 60)}分钟`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>批量生成钱包</DialogTitle>
          <DialogDescription>
            设置要生成的钱包数量和类型。生成将在后台进行，即使关闭此对话框或页面，进度也会保持。
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="count">生成数量</Label>
            <Input
              id="count"
              type="number"
              value={count}
              onChange={handleCountChange}
              disabled={isRunning}
              placeholder="输入要生成的钱包数量"
              min={1}
            />
          </div>
          
          <div className="space-y-2">
            <Label>钱包类型</Label>
            <div className="flex space-x-4 items-center">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="trc20" 
                  checked={useTRC20} 
                  onCheckedChange={(checked) => setUseTRC20(!!checked)}
                  disabled={isRunning || (useERC20 === false)}
                />
                <Label htmlFor="trc20">TRC20</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="erc20" 
                  checked={useERC20} 
                  onCheckedChange={(checked) => setUseERC20(!!checked)}
                  disabled={isRunning || (useTRC20 === false)}
                />
                <Label htmlFor="erc20">ERC20</Label>
              </div>
            </div>
          </div>
          
          {useTRC20 && useERC20 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="trc20-ratio">TRC20 比例: {trc20Ratio}%</Label>
                <span className="text-sm text-muted-foreground">ERC20: {100 - trc20Ratio}%</span>
              </div>
              <Slider
                id="trc20-ratio"
                value={[trc20Ratio]}
                min={0}
                max={100}
                step={5}
                onValueChange={handleTrc20RatioChange}
                disabled={isRunning}
              />
            </div>
          )}
          
          {isRunning && (
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-sm mb-1">
                <span>进度</span>
                <span>{formatNumber(generatedCount)} / {formatNumber(count)} ({Math.round(progress)}%)</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>生成速度: {formatNumber(generationSpeed)}/秒</span>
                <span>剩余时间: {calculateTimeRemaining()}</span>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          {isRunning ? (
            <Button variant="destructive" onClick={handleStop}>停止生成</Button>
          ) : (
            <Button onClick={handleStart}>开始生成</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratorDialog;
