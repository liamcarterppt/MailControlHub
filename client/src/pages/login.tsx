import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TwoFactorForm } from "@/components/auth/two-factor-form";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [location, navigate] = useLocation();
  const { user, loginMutation } = useAuth();
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [username, setUsername] = useState("");
  
  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);
  
  // Define form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Submit handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(values, {
      onSuccess: (response) => {
        // Check if 2FA is required
        if (response.requireTwoFactor) {
          setTwoFactorRequired(true);
          setUsername(response.username);
        } else {
          navigate("/dashboard");
        }
      }
    });
  }
  
  // Handle successful 2FA verification
  function handleTwoFactorSuccess(user: any) {
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-6">
            <div className="text-primary text-4xl">
              <span className="fa-stack">
                <i className="fas fa-square fa-stack-2x"></i>
                <i className="fas fa-inbox fa-stack-1x fa-inverse"></i>
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {twoFactorRequired ? "Two-Factor Authentication" : "Sign in to your account"}
          </CardTitle>
          <CardDescription className="text-center">
            {twoFactorRequired
              ? "Enter the verification code from your authenticator app"
              : "Enter your username and password to access your mail server"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {twoFactorRequired ? (
            <TwoFactorForm 
              username={username} 
              onSuccess={handleTwoFactorSuccess} 
            />
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="your-username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
        {!twoFactorRequired && (
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
