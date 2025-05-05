import React from "react";
import { Card } from "@/components/ui/card";
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  CheckIcon, 
  ClockIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusCardProps } from "@/lib/types";

export function StatusCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  info,
  infoStatus = "neutral",
  progressPercentage,
  progressTotal
}: StatusCardProps) {
  // Determine info icon and color based on status
  const getInfoIcon = () => {
    switch (infoStatus) {
      case "success":
        return <ArrowUpIcon className="w-3 h-3 mr-1" />;
      case "warning":
        return <ClockIcon className="w-3 h-3 mr-1" />;
      case "danger":
        return <ArrowDownIcon className="w-3 h-3 mr-1" />;
      default:
        return <CheckIcon className="w-3 h-3 mr-1" />;
    }
  };

  const getInfoColor = () => {
    switch (infoStatus) {
      case "success":
        return "text-success";
      case "warning":
        return "text-warning";
      case "danger":
        return "text-danger";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="bg-white rounded-lg shadow p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-semibold text-foreground mt-1">{value}</h3>
        </div>
        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", iconBgColor)}>
          <div className={cn("w-5 h-5", iconColor)}>{icon}</div>
        </div>
      </div>
      
      {info && (
        <div className={cn("mt-4 text-xs flex items-center", getInfoColor())}>
          {getInfoIcon()}
          <span>{info}</span>
        </div>
      )}
      
      {progressPercentage !== undefined && (
        <div className="mt-2">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          {progressTotal && (
            <div className="mt-1 text-xs text-muted-foreground">
              {progressPercentage}% of {progressTotal} used
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
