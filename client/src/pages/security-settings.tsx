import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TwoFactorSetup } from "@/components/security/two-factor-setup";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Define the password change form schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters")
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("2fa");
  
  // Query for 2FA status
  const { data: twoFactorStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/2fa/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/2fa/status");
      if (!res.ok) throw new Error("Failed to fetch 2FA status");
      return res.json();
    }
  });
  
  // Password change form
  const passwordForm = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: ""
    }
  });
  
  // Password change mutation
  const passwordChangeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordChangeSchema>) => {
      const res = await apiRequest("POST", "/api/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to change password");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Change Password",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handlePasswordChange = (values: z.infer<typeof passwordChangeSchema>) => {
    passwordChangeMutation.mutate(values);
  };
  
  const handleSetupComplete = () => {
    toast({
      title: "Setup Complete",
      description: "Two-factor authentication is now enabled on your account.",
    });
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