import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MailQueueProps } from "@/lib/types";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

export function MailQueue({ stats }: MailQueueProps) {
  const data = [
    { name: "Pending", value: stats.pending, color: "#f59e0b" },
    { name: "Sent", value: stats.sent, color: "#10b981" },
    { name: "Failed", value: stats.failed, color: "#ef4444" },
  ];

  const total = stats.pending + stats.sent + stats.failed;

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="font-semibold text-foreground">Mail Queue Status</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        {total === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>No mail in queue</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between flex-wrap mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-warning"></div>
                <span className="text-sm">Pending: {stats.pending}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="text-sm">Sent: {stats.sent}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-danger"></div>
                <span className="text-sm">Failed: {stats.failed}</span>
              </div>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={5}
                    dataKey="value"
                    labelLine={false}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} emails`, null]}
                    labelFormatter={() => ""}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
