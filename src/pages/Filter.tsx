
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
        title: "Filter Error",
        description: "Failed to fetch wallets from database.",
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
      title: "Copied",
      description: "Address copied to clipboard.",
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Filter Wallets</h1>
        <Button variant="outline" onClick={handleClear}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Search Criteria</CardTitle>
          <CardDescription>
            Filter wallets by address pattern, type, and other criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="type">Wallet Type</Label>
              <Select value={filterOptions.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select wallet type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="TRC20">TRC20 Only</SelectItem>
                  <SelectItem value="ERC20">ERC20 Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pattern">Address Pattern</Label>
              <div className="flex space-x-2">
                <Input 
                  id="pattern" 
                  placeholder="Enter full or partial address" 
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
              <Label htmlFor="dateFrom">From Date</Label>
              <div className="flex space-x-2">
                <Input 
                  id="dateFrom" 
                  placeholder="Any time" 
                  disabled
                />
                <Button variant="outline" size="icon" disabled>
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <div className="flex space-x-2">
                <Input 
                  id="dateTo" 
                  placeholder="Any time" 
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
              Total database entries: {walletDB.getTotalCount().toLocaleString()}
            </div>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search Wallets'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
          <CardDescription>
            Found {totalResults.toLocaleString()} wallet{totalResults !== 1 ? 's' : ''} matching your criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead className="w-36">Created At</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
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
                          title="Copy address"
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
                        'No wallets found matching your criteria'
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
                Showing {filteredWallets.length} of {totalResults} results
              </div>
              <Button variant="outline" size="sm" disabled>
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Filter;
