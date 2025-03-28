
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Filter as FilterIcon, Copy, RefreshCw, Search, Calendar, CheckCheck } from 'lucide-react';
import { FilterOptions, Wallet, WalletType } from '@/lib/types';
import { walletDB } from '@/lib/database';
import { useToast } from '@/components/ui/use-toast';

const Filter: React.FC = () => {
  const { toast } = useToast();
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    type: 'ALL',
    pattern: '',
    dateFrom: null,
    dateTo: null,
    limit: 100,
  });
  
  const [filteredWallets, setFilteredWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  
  const fetchWallets = async () => {
    setIsLoading(true);
    try {
      const wallets = await walletDB.getWallets(filterOptions);
      setFilteredWallets(wallets);
      setTotalResults(wallets.length);
    } catch (error) {
      console.error('Failed to fetch wallets', error);
      toast({
        title: "筛选错误",
        description: "从数据库获取钱包失败。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTypeChange = (value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      type: value as WalletType | 'ALL',
    }));
  };
  
  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterOptions(prev => ({
      ...prev,
      pattern: e.target.value,
    }));
  };
  
  const handleSearch = () => {
    fetchWallets();
  };
  
  const handleClear = () => {
    setFilterOptions({
      type: 'ALL',
      pattern: '',
      dateFrom: null,
      dateTo: null,
      limit: 100,
    });
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: "地址已复制到剪贴板。",
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">筛选钱包</h1>
        <Button variant="outline" onClick={handleClear}>
          <RefreshCw className="mr-2 h-4 w-4" />
          清除筛选条件
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>搜索条件</CardTitle>
          <CardDescription>
            按地址模式、类型和其他条件筛选钱包
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="type">钱包类型</Label>
              <Select value={filterOptions.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="选择钱包类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">所有类型</SelectItem>
                  <SelectItem value="TRC20">仅 TRC20</SelectItem>
                  <SelectItem value="ERC20">仅 ERC20</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pattern">地址模式</Label>
              <div className="flex space-x-2">
                <Input 
                  id="pattern" 
                  placeholder="输入完整或部分地址" 
                  value={filterOptions.pattern}
                  onChange={handlePatternChange}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">起始日期</Label>
              <div className="flex space-x-2">
                <Input 
                  id="dateFrom" 
                  placeholder="任何时间" 
                  disabled
                />
                <Button variant="outline" size="icon" disabled>
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateTo">结束日期</Label>
              <div className="flex space-x-2">
                <Input 
                  id="dateTo" 
                  placeholder="任何时间" 
                  disabled
                />
                <Button variant="outline" size="icon" disabled>
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-6">
            <div className="text-sm text-muted-foreground">
              <FilterIcon className="inline-block h-4 w-4 mr-1" />
              数据库总条目: {walletDB.getTotalCount().toLocaleString()}
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? '搜索中...' : '搜索钱包'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>搜索结果</CardTitle>
          <CardDescription>
            找到 {totalResults.toLocaleString()} 个符合条件的钱包
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">类型</TableHead>
                  <TableHead>钱包地址</TableHead>
                  <TableHead className="w-36">创建时间</TableHead>
                  <TableHead className="w-20 text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWallets.length > 0 ? (
                  filteredWallets.map((wallet, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${wallet.type === 'TRC20' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                          {wallet.type}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {wallet.address}
                      </TableCell>
                      <TableCell>
                        {wallet.createdAt.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => copyToClipboard(wallet.address)}
                          title="复制地址"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                      {isLoading ? (
                        <div className="flex justify-center items-center">
                          <div className="dot-pulse"></div>
                        </div>
                      ) : (
                        '未找到符合条件的钱包'
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredWallets.length > 0 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                显示 {filteredWallets.length} 条，共 {totalResults} 条结果
              </div>
              <Button variant="outline" size="sm" disabled>
                加载更多
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Filter;
