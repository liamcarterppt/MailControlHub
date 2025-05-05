import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ServerConfigForm } from "@/components/settings/server-config-form";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, ServerCrash } from "lucide-react";

export default function ServerConfig() {
  const { toast } = useToast();

  // Fetch server configuration
  const { data: serverConfig, isLoading, refetch } = useQuery({
    queryKey: ["/api/server-config"],
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleUpdate = async (id: number, value: string) => {
    try {
      await apiRequest("PATCH", `/api/server-config/${id}`, { value });
      toast({
        title: "Configuration updated",
        description: "Server configuration has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update server configuration",
        variant: "destructive",
      });
      console.error("Failed to update server configuration:", error);
    }
  };

  return (
    <MainLayout pageTitle="Server Configuration">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Configure server settings for optimal performance
        </p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !serverConfig || serverConfig.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
          <ServerCrash className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium">No Configuration Found</h3>
          <p className="text-muted-foreground mt-2 mb-6 text-center max-w-md">
            Server configuration data could not be loaded. Please try refreshing or contact support if the problem persists.
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      ) : (
        <ServerConfigForm 
          configs={serverConfig} 
          onUpdate={handleUpdate} 
        />
      )}
    </MainLayout>
  );
}
