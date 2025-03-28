
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart as BarChartIcon, 
  Database, 
  TrendingUp, 
  Wallet, 
  Calendar, 
  Activity,
  PieChart,
  RefreshCw
} from 'lucide-react';
import { walletGenerator } from '@/lib/walletGenerator';
import { walletDB } from '@/lib/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer, PieChart as RPieChart, Pie } from 'recharts';
import { Button } from '@/components/ui/button';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalWallets: 0,
    todayGenerated: 0,
    trc20Count: 0,
    erc20Count: 0,
    databaseSize: "0 KB",
    lastUpdated: new Date(),
  });
  
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // 模拟历史数据 - 在实际应用中应从数据库获取
  const generateChartData = (period: 'daily' | 'weekly' | 'monthly') => {
    const data = [];
    const now = new Date();
    let count = period === 'daily' ? 24 : period === 'weekly' ? 7 : 30;
    
    for (let i = 0; i < count; i++) {
      const date = new Date(now);
      
      if (period === 'daily') {
        date.setHours(now.getHours() - i);
        data.push({
          name: date.getHours() + ':00',
          TRC20: Math.floor(Math.random() * 5000) + 1000,
          ERC20: Math.floor(Math.random() * 4000) + 800,
        });
      } else if (period === 'weekly') {
        date.setDate(now.getDate() - i);
        data.push({
          name: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
          TRC20: Math.floor(Math.random() * 50000) + 10000,
          ERC20: Math.floor(Math.random() * 40000) + 8000,
        });
      } else {
        date.setDate(now.getDate() - i);
        data.push({
          name: date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }),
          TRC20: Math.floor(Math.random() * 500000) + 100000,
          ERC20: Math.floor(Math.random() * 400000) + 80000,
        });
      }
    }
    
    return data.reverse();
  };
  
  const [chartData, setChartData] = useState(generateChartData('daily'));
  
  // 获取统计数据
  const refreshStats = () => {
    const dbStats = walletDB.getStats();
    
    setStats({
      totalWallets: dbStats.totalStored,
      todayGenerated: walletDB.getTodayCount(),
      trc20Count: dbStats.trc20Count,
      erc20Count: dbStats.erc20Count,
      databaseSize: dbStats.databaseSize,
      lastUpdated: new Date(),
    });
  };
  
  useEffect(() => {
    refreshStats();
    
    const interval = setInterval(() => {
      refreshStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    setChartData(generateChartData(chartPeriod));
  }, [chartPeriod]);
  
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };
  
  const pieData = [
    { name: 'TRC20', value: stats.trc20Count, color: '#8884d8' },
    { name: 'ERC20', value: stats.erc20Count, color: '#82ca9d' },
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">分析面板</h1>
        <Button variant="outline" size="sm" onClick={refreshStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          刷新数据
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">钱包总数</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalWallets)}</div>
            <p className="text-xs text-muted-foreground">
              存储在数据库中的钱包总数
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">今日生成</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.todayGenerated)}</div>
            <p className="text-xs text-muted-foreground">
              今日生成的钱包地址数量
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">TRC20 钱包</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.trc20Count)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWallets > 0 
                ? `${((stats.trc20Count / stats.totalWallets) * 100).toFixed(1)}% 的总量`
                : '暂无数据'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">ERC20 钱包</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.erc20Count)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWallets > 0 
                ? `${((stats.erc20Count / stats.totalWallets) * 100).toFixed(1)}% 的总量`
                : '暂无数据'}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>钱包生成趋势</CardTitle>
            <CardDescription>
              查看不同时间段的钱包生成数量
            </CardDescription>
            <Tabs defaultValue={chartPeriod}>
              <TabsList className="mt-2">
                <TabsTrigger 
                  value="daily"
                  onClick={() => setChartPeriod('daily')}
                >
                  24小时
                </TabsTrigger>
                <TabsTrigger 
                  value="weekly"
                  onClick={() => setChartPeriod('weekly')}
                >
                  7天
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly"
                  onClick={() => setChartPeriod('monthly')}
                >
                  30天
                </TabsTrigger>
              </TabsList>
              {/* The TabsContent would normally go here, but it's not being used in this component */}
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="TRC20" fill="#8884d8" />
                  <Bar dataKey="ERC20" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground text-center mt-2">
              最后更新: {stats.lastUpdated.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>钱包类型分布</CardTitle>
            <CardDescription>
              TRC20 和 ERC20 钱包的比例
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#8884d8] mr-2"></div>
                <span className="text-sm">TRC20</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-[#82ca9d] mr-2"></div>
                <span className="text-sm">ERC20</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-sm font-medium">数据库信息</div>
              <div className="mt-2 text-xs text-muted-foreground">
                <div className="flex justify-between py-1">
                  <span>存储大小:</span>
                  <span>{stats.databaseSize}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>TRC20 钱包:</span>
                  <span>{formatNumber(stats.trc20Count)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>ERC20 钱包:</span>
                  <span>{formatNumber(stats.erc20Count)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
