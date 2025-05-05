import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getStatusInfo } from "@/lib/utils";
import { SystemStatusProps } from "@/lib/types";

export function SystemStatus({ services }: SystemStatusProps) {
  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="font-semibold text-foreground">System Status</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex flex-col space-y-4">
          {services.map((service) => {
            const statusInfo = getStatusInfo(service.status);
            
            return (
              <div key={service.id} className="flex justify-between items-center p-3 bg-accent rounded">
                <div className="flex items-center">
                  <span className={`w-3 h-3 ${statusInfo.color} rounded-full mr-3`}></span>
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <div>
                  <span className={`px-2 py-1 ${statusInfo.bgColor} ${statusInfo.color} rounded text-xs`}>
                    {statusInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
