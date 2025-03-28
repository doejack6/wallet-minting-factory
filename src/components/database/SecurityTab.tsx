
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const SecurityTab: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>安全信息</CardTitle>
        <CardDescription>
          数据保护和隐私措施
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>警告：私钥存储</AlertTitle>
            <AlertDescription>
              私钥以明文形式存储仅用于演示目的。在生产环境中，应实施带有适当密钥管理的加密存储。
            </AlertDescription>
          </Alert>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-sm font-medium mb-2">数据隔离</div>
              <div className="text-xs">
                所有生成的钱包数据都在本地存储，与外部网络隔离。数据不会同步到云服务或外部服务器。
              </div>
            </div>
            
            <div className="p-4 bg-secondary rounded-lg">
              <div className="text-sm font-medium mb-2">安全随机生成</div>
              <div className="text-xs">
                钱包生成使用加密安全的随机数生成器，确保私钥不能被预测或重现。
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-secondary rounded-lg mt-4">
            <div className="text-sm font-medium mb-2">安全建议</div>
            <ul className="text-xs space-y-2">
              <li>• 定期备份您的钱包数据库以防止数据丢失</li>
              <li>• 将备份存储在安全的加密存储中</li>
              <li>• 考虑为私钥存储实施额外的加密</li>
              <li>• 对于生产用途，请考虑硬件安全模块(HSM)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityTab;
