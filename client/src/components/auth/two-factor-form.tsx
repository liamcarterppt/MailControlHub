import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, KeyRound } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TwoFactorFormProps {
  username: string;
  onSuccess: (user: any) => void;
}

export function TwoFactorForm({ username, onSuccess }: TwoFactorFormProps) {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [backupCode, setBackupCode] = useState("");
  
  const verifyMutation = useMutation({
    mutationFn: async ({ token, useBackupCode }: { token: string; useBackupCode: boolean }) => {
      const res = await apiRequest("POST", "/api/login/2fa", {
        username,
        token,
        useBackupCode
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Authentication failed");
      }
      
      return await res.json();
    },
    onSuccess: (user) => {
      // Update user data in auth context
      queryClient.setQueryData(["/api/user"], user);
      
      // Notify parent component
      onSuccess(user);
      
      toast({
        title: "Authentication successful",
        description: "You have been logged in successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      toast({
        title: "Validation error",
        description: "Please enter a verification code",
        variant: "destructive"
      });
      return;
    }
    
    verifyMutation.mutate({ token, useBackupCode: false });
  };
  
  const handleBackupCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!backupCode.trim()) {
      toast({
        title: "Validation error",
        description: "Please enter a backup code",
        variant: "destructive"
      });
      return;
    }
    
    verifyMutation.mutate({ token: backupCode, useBackupCode: true });
  };
  
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Two-Factor Authentication</h1>
        <p className="text-sm text-muted-foreground">
          Enter the verification code from your authenticator app
        </p>
      </div>
      
      <Alert variant="default" className="bg-muted/50">
        <KeyRound className="h-4 w-4" />
        <AlertTitle>Verification required</AlertTitle>
        <AlertDescription>
          Your account is protected with two-factor authentication.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="app" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="app">Authenticator App</TabsTrigger>
          <TabsTrigger value="backup">Backup Code</TabsTrigger>
        </TabsList>
        
        <TabsContent value="app" className="mt-4 space-y-4">
          <form onSubmit={handleTokenSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Authentication Code</Label>
              <Input
                id="token"
                placeholder="Enter your 6-digit code"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                maxLength={6}
                className="text-center tracking-widest text-lg"
              />
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify
            </Button>
          </form>
        </TabsContent>
        
        <TabsContent value="backup" className="mt-4 space-y-4">
          <form onSubmit={handleBackupCodeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backupCode">Backup Code</Label>
              <Input
                id="backupCode"
                placeholder="Enter your backup code"
                value={backupCode}
                onChange={(e) => setBackupCode(e.target.value)}
                className="text-center font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Use one of your backup codes if you don't have access to your authenticator app.
              </p>
            </div>
            
            <Button
              type="submit"
              className="w-full"
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify Backup Code
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}