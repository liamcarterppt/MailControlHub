import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Check, Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, copy] = useCopyToClipboard();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [activeCopy, setActiveCopy] = useState<string | null>(null);
  
  // Query for 2FA status
  const { data: twoFactorStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/2fa/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/2fa/status");
      return await res.json();
    }
  });
  
  // Setup mutation - initiates 2FA setup
  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/setup");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Setup Started",
        description: "Scan the QR code with your authenticator app.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Verify mutation - validates the token and enables 2FA
  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/2fa/verify", { token });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled on your account.",
      });
      setToken("");
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Disable mutation - disables 2FA for the account
  const disableMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await apiRequest("POST", "/api/2fa/disable", { password });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled on your account.",
      });
      setPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Disable Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Regenerate backup codes mutation
  const regenerateCodesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/regenerate-backup-codes");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Backup Codes Regenerated",
        description: "Your new backup codes have been generated. Save them in a secure place.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/2fa/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Regeneration Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleCopyCode = async (code: string) => {
    await copy(code);
    setActiveCopy(code);
    
    setTimeout(() => {
      setActiveCopy(null);
    }, 2000);
    
    toast({
      title: "Copied",
      description: "Backup code copied to clipboard",
    });
  };
  
  // Handle setup form submission
  const handleSetup = () => {
    setupMutation.mutate();
  };
  
  // Handle verify form submission
  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a verification code",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate(token);
  };
  
  // Handle disable form submission
  const handleDisable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter your password",
        variant: "destructive",
      });
      return;
    }
    disableMutation.mutate(password);
  };
  
  const handleRegenerateCodes = () => {
    if (confirm("Are you sure you want to regenerate your backup codes? This will invalidate your existing backup codes.")) {
      regenerateCodesMutation.mutate();
    }
  };
  
  if (isLoadingStatus) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account security settings</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings">Back to Settings</Link>
        </Button>
      </div>
      
      <Tabs defaultValue="2fa" className="w-full">
        <TabsList className="grid grid-cols-1 sm:grid-cols-3 w-full mb-8">
          <TabsTrigger value="2fa">Two-Factor Authentication</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>
        
        {/* Two-Factor Authentication Tab */}
        <TabsContent value="2fa" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Enhanced Security</AlertTitle>
            <AlertDescription>
              Two-factor authentication adds an extra layer of security to your account. 
              In addition to your password, you'll need a code from your authenticator app to sign in.
            </AlertDescription>
          </Alert>
          
          {/* If 2FA is not set up */}
          {!twoFactorStatus?.enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldOff className="mr-2 h-5 w-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription>
                  Set up two-factor authentication to secure your account with an extra layer of protection.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {setupMutation.data ? (
                  <div className="space-y-6">
                    <div className="grid gap-4">
                      <div className="flex justify-center">
                        <img 
                          src={setupMutation.data.qrCodeUrl} 
                          alt="QR Code for 2FA setup" 
                          className="border border-border rounded-lg p-2 max-w-[220px]"
                        />
                      </div>
                      
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium">Unable to scan the QR code?</p>
                        <div className="flex items-center justify-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {setupMutation.data.secret}
                          </code>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            onClick={() => handleCopyCode(setupMutation.data.secret)}
                          >
                            {activeCopy === setupMutation.data.secret ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleVerify} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="token">Verification Code</Label>
                        <Input
                          id="token"
                          placeholder="Enter the 6-digit code"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
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
                        Verify and Enable
                      </Button>
                    </form>
                    
                    {setupMutation.data.backupCodes && (
                      <div className="space-y-3 border border-border p-4 rounded-md">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">Backup Codes</p>
                          <p className="text-xs text-muted-foreground">Save these somewhere safe</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {setupMutation.data.backupCodes.map((code: string) => (
                            <div key={code} className="flex items-center justify-between bg-muted px-3 py-1 rounded-md">
                              <code className="text-sm">{code}</code>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-6 w-6" 
                                onClick={() => handleCopyCode(code)}
                              >
                                {activeCopy === code ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Each backup code can only be used once. If you lose your authenticator device, you can use these codes to sign in.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button 
                    onClick={handleSetup}
                    disabled={setupMutation.isPending}
                    className="w-full"
                  >
                    {setupMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Set Up Two-Factor Authentication
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
          
          {/* If 2FA is already enabled */}
          {twoFactorStatus?.enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-green-600">
                  <ShieldCheck className="mr-2 h-5 w-5" />
                  Two-Factor Authentication Enabled
                </CardTitle>
                <CardDescription>
                  Your account is protected with two-factor authentication.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <Check className="h-4 w-4 text-green-600" />
                  <AlertTitle className="text-green-700">Active Protection</AlertTitle>
                  <AlertDescription className="text-green-700">
                    Your account is secured with two-factor authentication. 
                    You'll need your authenticator app or a backup code when signing in.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div>
                    <p className="font-medium mb-1">Backup Codes</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      You have {twoFactorStatus.backupCodesCount} backup codes remaining. 
                      Each code can only be used once.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={handleRegenerateCodes}
                      disabled={regenerateCodesMutation.isPending}
                    >
                      {regenerateCodesMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Regenerate Backup Codes
                    </Button>
                  </div>
                  
                  {regenerateCodesMutation.data?.backupCodes && (
                    <div className="border border-border p-4 rounded-md space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">New Backup Codes</p>
                        <p className="text-xs text-muted-foreground">Save these somewhere safe</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {regenerateCodesMutation.data.backupCodes.map((code: string) => (
                          <div key={code} className="flex items-center justify-between bg-muted px-3 py-1 rounded-md">
                            <code className="text-sm">{code}</code>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-6 w-6" 
                              onClick={() => handleCopyCode(code)}
                            >
                              {activeCopy === code ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t">
                    <p className="font-medium mb-4">Disable Two-Factor Authentication</p>
                    <form onSubmit={handleDisable} className="space-y-4">
                      <div className="grid gap-2">
                        <Label htmlFor="password">Confirm Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your current password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      
                      <Button 
                        type="submit" 
                        variant="destructive"
                        disabled={disableMutation.isPending}
                      >
                        {disableMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Disable Two-Factor Authentication
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Active Sessions Tab - stub for future implementation */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                View and manage your active sessions across devices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Session management will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Password Change Tab - stub for future implementation */}
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your account password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Password change functionality will be available in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}