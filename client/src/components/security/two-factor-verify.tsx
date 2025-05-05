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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

// Define the schema for the verification form
const verificationSchema = z.object({
  token: z.string().min(6, "Code must be at least 6 characters").max(10),
  useBackupCode: z.boolean().default(false),
});

type TwoFactorVerifyProps = {
  username: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
};

export function TwoFactorVerify({ username, onSuccess, onCancel }: TwoFactorVerifyProps) {
  const { toast } = useToast();
  
  // Verification mutation
  const verifyMutation = useMutation({
    mutationFn: async (values: z.infer<typeof verificationSchema>) => {
      const res = await apiRequest('POST', '/api/2fa/verify', {
        username,
        token: values.token,
        useBackupCode: values.useBackupCode
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Verification failed');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Authentication successful',
      });
      onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Setup the form
  const form = useForm<z.infer<typeof verificationSchema>>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      token: '',
      useBackupCode: false,
    }
  });
  
  const handleVerify = (values: z.infer<typeof verificationSchema>) => {
    verifyMutation.mutate(values);
  };
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Please enter the verification code from your authenticator app to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleVerify)} className="space-y-4">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder={form.watch('useBackupCode') ? "Enter backup code" : "Enter 6-digit code"} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="useBackupCode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Use backup code</FormLabel>
                    <FormDescription>
                      Use a backup code if you don't have access to your authenticator app.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            
            <div className="flex justify-between pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
              >
                Back to Login
              </Button>
              <Button 
                type="submit" 
                disabled={verifyMutation.isPending}
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}