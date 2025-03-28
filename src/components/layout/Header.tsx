
import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Bell, User } from 'lucide-react';

const Header = () => {
  return (
    <header className="border-b border-border bg-card p-4 flex items-center justify-between h-16">
      <div className="flex items-center">
        <SidebarTrigger />
      </div>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-right mr-2">
            <div className="font-medium">管理员</div>
            <div className="text-muted-foreground text-xs">本地系统</div>
          </div>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
