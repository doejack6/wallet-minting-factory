
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader 
} from '@/components/ui/sidebar';
import { 
  BarChart, 
  Wallet,
  Filter,
  Database
} from 'lucide-react';

const AppSidebar = () => {
  const location = useLocation();
  
  const navigation = [
    { name: '分析', href: '/analytics', icon: BarChart },
    { name: '生成器', href: '/generator', icon: Wallet },
    { name: '筛选', href: '/filter', icon: Filter },
    { name: '数据库', href: '/database', icon: Database },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold">钱包工厂</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild className={location.pathname === item.href ? 'bg-accent' : ''}>
                    <Link to={item.href} className="flex items-center space-x-3">
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
