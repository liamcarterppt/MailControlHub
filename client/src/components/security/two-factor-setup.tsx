import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Copy, Check } from "lucide-react";

// Define the schemas for verification forms
const setupVerificationSchema = z.object({
  token: z.string().min(6, "Code must be at least 6 characters").max(8)
});

const disableSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required")
});

type TwoFactorSetupProps = {
  onSetupComplete?: () => void;
};

export function TwoFactorSetup({ onSetupComplete }: TwoFactorSetupProps) {
  const { toast } = useToast();
  const [copied, copy] = useCopyToClipboard();
  const [setupStep, setSetupStep] = useState<'init' | 'verify'>('init');
  const [setupData, setSetupData] = useState<{
    secret?: string;
    qrCode?: string;
    backupCodes?: string[];
  }>({});
  
  const queryClient = useQueryClient();
  
  // Query to get current 2FA status
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/2fa/status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/2fa/status');
      if (!res.ok) throw new Error('Failed to fetch 2FA status');
      return res.json();
    }
  });
  
  // Mutation to initialize 2FA setup
  const initSetupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/2fa/setup/init');
      if (!res.ok) throw new Error('Failed to initialize 2FA setup');
      return res.json();
    },
    onSuccess: (data) => {
      setSetupData({
        secret: data.secret,
        qrCode: data.qrCode,
        backupCodes: data.backupCodes
      });
      setSetupStep('verify');
    },
    onError: (error: Error) => {
      toast({
        title: 'Setup error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to verify and complete 2FA setup
  const verifySetupMutation = useMutation({
    mutationFn: async (values: z.infer<typeof setupVerificationSchema>) => {
      const res = await apiRequest('POST', '/api/2fa/setup/verify', values);
      if (!res.ok) throw new Error('Failed to verify 2FA setup');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been enabled successfully.',
      });
      
      // Refetch 2FA status
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
      
      // Call completion handler if provided
      if (onSetupComplete) {
        onSetupComplete();
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Mutation to disable 2FA
  const disableMutation = useMutation({
    mutationFn: async (values: z.infer<typeof disableSchema>) => {
      const res = await apiRequest('POST', '/api/2fa/disable', values);
      if (!res.ok) throw new Error('Failed to disable 2FA');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Two-factor authentication has been disabled.',
      });
      
      // Reset setup state
      setSetupStep('init');
      setSetupData({});
      
      // Refetch 2FA status
      queryClient.invalidateQueries({ queryKey: ['/api/2fa/status'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Form for step 2 - verification
  const verifyForm = useForm<z.infer<typeof setupVerificationSchema>>({
    resolver: zodResolver(setupVerificationSchema),
    defaultValues: {
      token: '',
    }
  });
  
  // Form for disabling 2FA
  const disableForm = useForm<z.infer<typeof disableSchema>>({
    resolver: zodResolver(disableSchema),
    defaultValues: {
      currentPassword: '',
    }
  });
  
  const handleDisable = (values: z.infer<typeof disableSchema>) => {
    disableMutation.mutate(values);
  };
  
  const handleInitSetup = () => {
    initSetupMutation.mutate();
  };
  
  const handleVerifySetup = (values: z.infer<typeof setupVerificationSchema>) => {
    verifySetupMutation.mutate(values);
  };
  
  const handleCopySecret = () => {
    if (setupData.secret) {
      copy(setupData.secret);
      toast({
        title: "Copied!",
        description: "Secret code copied to clipboard",
      });
    }
  };
  
  const handleCopyBackupCodes = () => {
    if (setupData.backupCodes) {
      copy(setupData.backupCodes.join('\n'));
      toast({
        title: "Copied!",
        description: "Backup codes copied to clipboard",
      });
    }
  };
  
  if (statusLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="py-10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  // If 2FA is already enabled, show disable form
  if (status?.enabled) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
          <CardDescription>
            Two-factor authentication is currently <span className="font-semibold text-green-600">enabled</span> for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-md p-4 mb-6">
            <p className="text-green-800 dark:text-green-300 text-sm">
              Your account is protected with two-factor authentication. 
              Each time you sign in, you will need to provide a verification code from your authenticator app.
            </p>
          </div>
          
          {status?.backupCodesCount > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Backup Codes</h3>
              <p className="text-sm text-muted-foreground mb-2">
                You have {status.backupCodesCount} backup codes remaining. 
                Each code can be used once to sign in if you don't have access to your authenticator app.
              </p>
            </div>
          )}
          
          <Separator className="my-6" />
          
          <h3 className="text-sm font-medium mb-4">Disable Two-Factor Authentication</h3>
          <Form {...disableForm}>
            <form onSubmit={disableForm.handleSubmit(handleDisable)}>
              <FormField
                control={disableForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your current password" {...field} />
                    </FormControl>
                    <FormDescription>
                      For security reasons, please confirm your password to disable 2FA.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-6">
                <Button 
                  type="submit" 
                  variant="destructive"
                  disabled={disableMutation.isPending}
                >
                  {disableMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disabling...
                    </>
                  ) : (
                    "Disable Two-Factor Authentication"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }
  
  // If 2FA is disabled, show setup interface
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enhance your account security by enabling two-factor authentication.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {setupStep === 'init' && (
          <div>
            <p className="text-sm text-muted-foreground mb-6">
              Two-factor authentication adds an extra layer of security to your account. 
              In addition to your password, you'll need to enter a verification code from 
              your authenticator app when signing in.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs mt-0.5">1</div>
                <div>
                  <h3 className="text-sm font-medium">Install an authenticator app</h3>
                  <p className="text-sm text-muted-foreground">
                    Download and install an authenticator app on your mobile device, such as 
                    Google Authenticator, Authy, or Microsoft Authenticator.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs mt-0.5">2</div>
                <div>
                  <h3 className="text-sm font-medium">Set up your authenticator</h3>
                  <p className="text-sm text-muted-foreground">
                    After clicking "Set Up", you'll be provided with a QR code or secret key to add 
                    to your authenticator app.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs mt-0.5">3</div>
                <div>
                  <h3 className="text-sm font-medium">Verify and save backup codes</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the verification code from your app, then save your backup codes in a secure location 
                    for emergency access to your account.
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleInitSetup} 
              disabled={initSetupMutation.isPending}
            >
              {initSetupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Set Up Two-Factor Authentication"
              )}
            </Button>
          </div>
        )}
        
        {setupStep === 'verify' && (
          <div>
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">1. Scan QR Code or Enter Secret Key</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use your authenticator app to scan the QR code or manually enter the secret key below.
              </p>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center justify-center bg-muted rounded-md p-4">
                  {setupData.qrCode && (
                    <img 
                      src={setupData.qrCode} 
                      alt="QR Code for authenticator app" 
                      className="max-w-full h-auto"
                    />
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Manual Entry</p>
                  <div className="flex items-center">
                    <div className="bg-muted rounded-md p-2 text-sm font-mono mr-2 flex-grow overflow-hidden">
                      {setupData.secret}
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleCopySecret}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter this code in your app if you can't scan the QR code.
                  </p>
                </div>
              </div>
            </div>
            
            <Separator className="my-6" />
            
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">2. Verification</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the verification code from your authenticator app to complete the setup.
              </p>
              
              <Form {...verifyForm}>
                <form onSubmit={verifyForm.handleSubmit(handleVerifySetup)}>
                  <FormField
                    control={verifyForm.control}
                    name="token"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter 6-digit code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="mt-4">
                    <Button 
                      type="submit" 
                      disabled={verifySetupMutation.isPending}
                    >
                      {verifySetupMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify and Enable"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
            
            <Separator className="my-6" />
            
            <div>
              <h3 className="text-sm font-medium mb-2">3. Save Your Backup Codes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Store these backup codes in a safe place. Each code can be used once to access your account 
                if you don't have your authenticator device.
              </p>
              
              <div className="bg-muted rounded-md p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes?.map((code, index) => (
                    <div key={index} className="font-mono text-sm">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              <Button 
                variant="outline" 
                onClick={handleCopyBackupCodes}
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                Copy Backup Codes
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}