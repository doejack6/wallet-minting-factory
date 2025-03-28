
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { walletDB } from '@/lib/database';
import { Wallet } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Copy, Eye, EyeOff, Shield } from 'lucide-react';

const PrivateKey: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  useEffect(() => {
    const fetchWallet = async () => {
      setIsLoading(true);
      try {
        if (id) {
          // Use the database to get the wallet by ID
          const wallets = await walletDB.getWallets({ 
            type: 'ALL', 
            pattern: '',
            patternType: 'ANY', // Add the missing property
            patternLength: 0,    // Add the missing property
            dateFrom: null, 
            dateTo: null, 
            limit: 1000 
          });
          
          const foundWallet = wallets.find(w => w.id === id);
          if (foundWallet) {
            setWallet(foundWallet);
          } else {
            toast({
              title: "未找到钱包",
              description: "无法找到指定ID的钱包",
              variant: "destructive",
            });
            navigate('/filter');
          }
        }
      } catch (error) {
        console.error('Failed to fetch wallet', error);
        toast({
          title: "获取钱包失败",
          description: "从数据库获取钱包信息失败。",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchWallet();
  }, [id, navigate, toast]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: `${type}已复制到剪贴板。`,
    });
  };

  const togglePrivateKeyVisibility = () => {
    setShowPrivateKey(!showPrivateKey);
  };

  const handleBack = () => {
    navigate('/filter');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="dot-pulse"></div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <Card className="max-w-2xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>找不到钱包</CardTitle>
          <CardDescription>
            无法找到指定ID的钱包信息
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回筛选页面
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={handleBack} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回筛选页面
        </Button>
        <h1 className="text-2xl font-bold">钱包私钥信息</h1>
      </div>

      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded text-xs ${wallet.type === 'TRC20' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
              {wallet.type}
            </span>
            钱包详情
          </CardTitle>
          <CardDescription>
            此页面显示钱包地址和私钥信息，请妥善保管
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">钱包地址</div>
            <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-md">
              <code className="font-mono text-sm break-all">{wallet.address}</code>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => copyToClipboard(wallet.address, "钱包地址")}
                title="复制地址"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground flex items-center">
              <Shield className="h-4 w-4 mr-1 text-destructive" />
              私钥（敏感信息）
            </div>
            <div className="flex items-center justify-between bg-destructive/10 p-3 rounded-md">
              <code className="font-mono text-sm break-all">
                {showPrivateKey ? wallet.privateKey : "••••••••••••••••••••••••••••••••••••••••••••••••••••"}
              </code>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={togglePrivateKeyVisibility}
                  title={showPrivateKey ? "隐藏私钥" : "显示私钥"}
                >
                  {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => copyToClipboard(wallet.privateKey, "私钥")}
                  title="复制私钥"
                  disabled={!showPrivateKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">公钥</div>
            <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-md">
              <code className="font-mono text-sm break-all">{wallet.publicKey}</code>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => copyToClipboard(wallet.publicKey, "公钥")}
                title="复制公钥"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">创建时间</div>
            <div className="bg-secondary/20 p-3 rounded-md">
              {wallet.createdAt.toLocaleString()}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="text-xs text-muted-foreground">
            <Shield className="inline-block h-3 w-3 mr-1" />
            请勿向任何人分享您的私钥
          </div>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回筛选页面
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PrivateKey;
