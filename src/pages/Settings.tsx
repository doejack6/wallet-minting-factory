
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">系统设置</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>个人资料</CardTitle>
            <CardDescription>管理您的账户信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">账户名</div>
              <div className="rounded-md border px-4 py-2">管理员</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">电子邮件</div>
              <div className="rounded-md border px-4 py-2">admin@example.com</div>
            </div>
            <div className="space-y-2">
              <div className="font-medium">角色</div>
              <div className="rounded-md border px-4 py-2">系统管理员</div>
            </div>
            <Button className="w-full">编辑资料</Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>安全设置</CardTitle>
            <CardDescription>管理您的账户安全选项</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full">更改密码</Button>
            <Button className="w-full" variant="outline">启用双因素认证</Button>
            <Separator />
            <div className="space-y-4">
              <h3 className="font-medium">登录通知</h3>
              <div className="flex items-center space-x-2">
                <Checkbox id="email" />
                <label htmlFor="email" className="text-sm">通过电子邮件接收登录通知</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sms" />
                <label htmlFor="sms" className="text-sm">通过短信接收登录通知</label>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              系统设置
            </CardTitle>
            <CardDescription>配置系统首选项</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-medium">界面设置</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox id="darkMode" defaultChecked />
                  <label htmlFor="darkMode" className="text-sm">启用暗黑模式</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="animations" defaultChecked />
                  <label htmlFor="animations" className="text-sm">启用动画效果</label>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-medium">通知设置</h3>
                <div className="flex items-center space-x-2">
                  <Checkbox id="updates" defaultChecked />
                  <label htmlFor="updates" className="text-sm">系统更新通知</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="activity" defaultChecked />
                  <label htmlFor="activity" className="text-sm">活动提醒</label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="outline">取消</Button>
              <Button>保存更改</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
