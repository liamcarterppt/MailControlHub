import React from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Icons } from "@/components/ui/icons";
import { formatRelativeTime, formatActivityDescription, getActivityInfo } from "@/lib/utils";
import { RecentActivityProps } from "@/lib/types";

export function RecentActivity({ activities, showViewAll = true }: RecentActivityProps) {
  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-5 py-4 border-b border-border flex justify-between items-center">
        <CardTitle className="font-semibold text-foreground">Recent Activity</CardTitle>
        {showViewAll && (
          <Link href="/activity" className="text-xs text-primary hover:underline">
            View all
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex flex-col space-y-4">
          {activities.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No recent activity to display
            </div>
          ) : (
            activities.map((activity) => {
              const activityInfo = getActivityInfo(activity.action);
              const Icon = Icons[activityInfo.icon as keyof typeof Icons] || Icons.activityIcon;
              
              return (
                <div key={activity.id} className="flex items-start">
                  <div className={`w-8 h-8 ${activityInfo.bgColor} rounded-full flex items-center justify-center mr-3`}>
                    <Icon className={`${activityInfo.iconColor} text-xs`} />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">
                      {formatActivityDescription(activity.action, activity.details)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
