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
import { Filter as FilterIcon, Copy, RefreshCw, Search, Key, Hash, FileDown, FileCsv, FileText } from 'lucide-react';
import { FilterOptions, Wallet, WalletType, SearchPatternType } from '@/lib/types';
import { walletDB } from '@/lib/database';
import { useToast } from '@/components/ui/use-toast';
import { Link } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportWallets } from '@/lib/exportUtils';

const Filter: React.FC = () => {
  const { toast } = useToast();
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    type: 'ALL',
    pattern: '',
    patternType: 'ANY',
    patternLength: 0,
    dateFrom: null,
    dateTo: null,
    limit: 100,
  });
  
  const [filteredWallets, setFilteredWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
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
  
  const handlePatternTypeChange = (value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      patternType: value as SearchPatternType,
      patternLength: value === 'END' || value === 'START' ? 4 : 0,
    }));
  };
  
  const handlePatternLengthChange = (value: string) => {
    setFilterOptions(prev => ({
      ...prev,
      patternLength: parseInt(value) || 0,
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
      patternType: 'ANY',
      patternLength: 0,
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
  
  const getPatternTypeLabel = () => {
    switch (filterOptions.patternType) {
      case 'ANY': return '任意位置';
      case 'END': return `后${filterOptions.patternLength}位`;
      case 'START': return `前${filterOptions.patternLength}位`;
      case 'START_END': return '前后组合';
      case 'CUSTOM': return `自定义${filterOptions.patternLength}位`;
      default: return '选择搜索模式';
    }
  };
  
  const patternPlaceholder = () => {
    switch (filterOptions.patternType) {
      case 'ANY': return '输入完整或部分地址';
      case 'END': return `输入后${filterOptions.patternLength}位`;
      case 'START': return `输入前${filterOptions.patternLength}位`;
      case 'START_END': return '格式: 开头+结尾 (例如: Tx+9z)';
      case 'CUSTOM': return `输入${filterOptions.patternLength}位自定义模式`;
      default: return '输入搜索模式';
    }
  };
  
  const handleExport = (format: 'csv' | 'txt') => {
    if (filteredWallets.length === 0) {
      toast({
        title: "无数据可导出",
        description: "没有符合筛选条件的钱包记录可导出。",
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    try {
      const filename = `filtered-wallets-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;
      exportWallets(filteredWallets, format, filename);
      
      toast({
        title: "导出成功",
        description: `已成功导出 ${filteredWallets.length} 条记录到 ${format.toUpperCase()} 文件。`,
      });
    } catch (error) {
      console.error('Failed to export wallets', error);
      toast({
        title: "导出失败",
        description: "导出钱包数据时出错。",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">筛选钱包</h1>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={filteredWallets.length === 0 || isExporting}>
                <FileDown className="mr-2 h-4 w-4" />
                导出结果
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileCsv className="mr-2 h-4 w-4" />
                导出为CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('txt')}>
                <FileText className="mr-2 h-4 w-4" />
                导出为TXT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={handleClear}>
            <RefreshCw className="mr-2 h-4 w-4" />
            清除筛选条件
          </Button>
        </div>
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
            
            <div className="space-y-2">
              <Label htmlFor="patternType">搜索模式</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {getPatternTypeLabel()}
                    <Hash className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handlePatternTypeChange('ANY')}>
                    任意位置
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePatternTypeChange('END')}>
                    后4位
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePatternTypeChange('END')}>
                    后5位
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePatternTypeChange('END')}>
                    后6位
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePatternTypeChange('START')}>
                    前4位
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePatternTypeChange('START_END')}>
                    前后组合 (例如: Tx+9z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handlePatternTypeChange('CUSTOM')}>
                    自定义位数
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="pattern">地址模式</Label>
              <div className="flex space-x-2">
                <Input 
                  id="pattern" 
                  placeholder={patternPlaceholder()} 
                  value={filterOptions.pattern}
                  onChange={handlePatternChange}
                />
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <Collapsible 
            open={isAdvancedOpen} 
            onOpenChange={setIsAdvancedOpen}
            className="mt-6"
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex w-full justify-between p-0">
                <span>高级选项</span>
                <span className="text-xs text-muted-foreground">
                  {isAdvancedOpen ? '隐藏' : '显示'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              {(filterOptions.patternType === 'END' || 
                filterOptions.patternType === 'START' || 
                filterOptions.patternType === 'CUSTOM') && (
                <div className="mb-4">
                  <Label htmlFor="patternLength" className="mb-2 block">
                    位数长度
                  </Label>
                  <Select 
                    value={filterOptions.patternLength.toString()} 
                    onValueChange={handlePatternLengthChange}
                  >
                    <SelectTrigger className="w-full md:w-40">
                      <SelectValue placeholder="选择位数" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4">4位</SelectItem>
                      <SelectItem value="5">5位</SelectItem>
                      <SelectItem value="6">6位</SelectItem>
                      <SelectItem value="8">8位</SelectItem>
                      <SelectItem value="10">10位</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          
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
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">类型</TableHead>
                  <TableHead>钱包地址</TableHead>
                  <TableHead className="w-36">创建时间</TableHead>
                  <TableHead className="w-32 text-right">操作</TableHead>
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
                      <TableCell className="text-right flex justify-end space-x-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => copyToClipboard(wallet.address)}
                          title="复制地址"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Link to={`/privatekey/${wallet.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            title="查看私钥"
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                        </Link>
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
          </ScrollArea>
          
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
