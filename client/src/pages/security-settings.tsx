import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { SecuritySettingsForm } from "@/components/settings/security-settings-form";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Shield, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SecuritySettings() {
  const { toast } = useToast();

  // Fetch security settings (using server config endpoint since they're the same)
  const { data: securitySettings, isLoading, refetch } = useQuery({
    queryKey: ["/api/server-config"],
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleUpdate = async (id: number, value: string) => {
    try {
      await apiRequest("PATCH", `/api/server-config/${id}`, { value });
      toast({
        title: "Security settings updated",
        description: "Your security settings have been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update security settings",
        variant: "destructive",
      });
      console.error("Failed to update security settings:", error);
    }
  };

  return (
    <MainLayout pageTitle="Security Settings">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Configure security settings for your mail server
        </p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Alert className="mb-6 border-warning/50 bg-warning/10">
        <Shield className="h-4 w-4 text-warning" />
        <AlertTitle>Security Recommendation</AlertTitle>
        <AlertDescription>
          For optimal security, we recommend enabling all encryption options and setting spam threshold to at least 5.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !securitySettings || securitySettings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg border">
          <Lock className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium">No Security Settings Found</h3>
          <p className="text-muted-foreground mt-2 mb-6 text-center max-w-md">
            Security settings could not be loaded. Please try refreshing or contact support if the problem persists.
          </p>
          <Button onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      ) : (
        <SecuritySettingsForm 
          settings={securitySettings.filter((setting: any) => 
            setting.name === "spam_threshold" || 
            setting.description?.toLowerCase().includes("security") ||
            setting.description?.toLowerCase().includes("spam") ||
            setting.description?.toLowerCase().includes("protection")
          )} 
          onUpdate={handleUpdate} 
        />
      )}
    </MainLayout>
  );
}
