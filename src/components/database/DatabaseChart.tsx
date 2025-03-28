
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DatabaseIcon } from 'lucide-react';

interface DatabaseChartProps {
  totalStored: number;
  trc20Count: number;
  erc20Count: number;
}

const DatabaseChart: React.FC<DatabaseChartProps> = ({
  totalStored,
  trc20Count,
  erc20Count
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>分布情况</CardTitle>
        <CardDescription>
          数据库中钱包类型分布
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-60 flex items-center justify-center">
          {totalStored > 0 ? (
            <div className="w-full h-full flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold">{totalStored.toLocaleString()}</div>
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
                  strokeDasharray={`${(trc20Count / totalStored) * 251.2} 251.2`}
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="hsl(var(--accent))"
                  strokeWidth="20"
                  strokeDasharray={`${(erc20Count / totalStored) * 251.2} 251.2`}
                  strokeDashoffset={`-${(trc20Count / totalStored) * 251.2}`}
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
                ({totalStored ? 
                  `${Math.round((trc20Count / totalStored) * 100)}%` : 
                  '0%'})
              </span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-accent rounded-full mr-2"></div>
            <div className="text-sm">ERC20 
              <span className="text-xs text-muted-foreground ml-1">
                ({totalStored ? 
                  `${Math.round((erc20Count / totalStored) * 100)}%` : 
                  '0%'})
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DatabaseChart;
