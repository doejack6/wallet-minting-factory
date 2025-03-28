
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity as ActivityIcon } from 'lucide-react';

const Activity = () => {
  // 示例活动数据
  const activities = [
    { id: 1, title: "创建新钱包", time: "10:30 AM", date: "今天", status: "完成" },
    { id: 2, title: "资金转移", time: "09:15 AM", date: "今天", status: "处理中" },
    { id: 3, title: "系统更新", time: "昨天", date: "2023-06-14", status: "完成" },
    { id: 4, title: "安全审核", time: "昨天", date: "2023-06-14", status: "完成" },
    { id: 5, title: "数据备份", time: "3 天前", date: "2023-06-12", status: "完成" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">活动记录</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivityIcon className="h-5 w-5" />
            最近活动
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.time} • {activity.date}
                  </p>
                </div>
                <div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activity.status === "完成" 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" 
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                  }`}>
                    {activity.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>统计概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-sm">今日活动</div>
              <div className="text-2xl font-bold">24</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-sm">本周活动</div>
              <div className="text-2xl font-bold">142</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-sm">平均响应时间</div>
              <div className="text-2xl font-bold">1.2s</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-muted-foreground text-sm">成功率</div>
              <div className="text-2xl font-bold">99.8%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Activity;
