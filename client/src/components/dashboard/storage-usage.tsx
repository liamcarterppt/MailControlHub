import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import { StorageUsageProps } from "@/lib/types";

export function StorageUsage({ used, total }: StorageUsageProps) {
  const usagePercentage = Math.min(Math.round((used / total) * 100), 100);
  
  // Calculate color based on usage percentage
  const getColorClass = () => {
    if (usagePercentage < 70) {
      return "bg-success";
    } else if (usagePercentage < 90) {
      return "bg-warning";
    } else {
      return "bg-danger";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="font-semibold text-foreground">Storage Usage</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Used</span>
          <span className="text-lg font-semibold text-foreground">{formatBytes(used)}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-semibold text-foreground">{formatBytes(total)}</span>
        </div>
        
        <div className="mt-4">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm text-foreground">Usage</span>
            <span className="text-sm font-medium">{usagePercentage}%</span>
          </div>
          <Progress value={usagePercentage} className="h-2" indicatorClassName={getColorClass()} />
          <div className="mt-1 text-xs text-muted-foreground">
            {formatBytes(used)} of {formatBytes(total)} used
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
