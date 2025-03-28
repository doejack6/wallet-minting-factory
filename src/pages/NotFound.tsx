
import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-medium">页面未找到</h2>
        <p className="text-muted-foreground max-w-md">
          您要查找的页面可能已被移除、更名或暂时不可用。
        </p>
        <Button asChild className="mt-4">
          <Link to="/analytics">
            <Home className="mr-2 h-4 w-4" />
            返回仪表盘
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
