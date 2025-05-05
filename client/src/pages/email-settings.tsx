import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import MainLayout from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Switch
} from "@/components/ui/switch";
import { Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const formSchema = z.object({
  apiKey: z.string(),
  fromEmail: z.string().email("Please enter a valid email").min(1, "From email is required"),
  fromName: z.string().min(1, "From name is required"),
  replyToEmail: z.string().email("Please enter a valid email").min(1, "Reply-to email is required"),
  footerText: z.string(),
  enabled: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const testEmailSchema = z.object({
  to: z.string().email("Please enter a valid email").min(1, "Email address is required"),
});

export default function EmailSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

  // Get email settings from the server
  const { data: emailSettings, isLoading } = useQuery<FormValues>({
    queryKey: ["/api/email-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/email-settings");
      return response.json();
    },
  });

  // Update email settings mutation
  const updateEmailSettings = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("POST", "/api/email-settings", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Email settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/email-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update email settings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Test email mutation
  const testEmailForm = useForm({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to: user?.email || "",
    },
  });

  const testEmailMutation = useMutation({
    mutationFn: async (values: z.infer<typeof testEmailSchema>) => {
      const response = await apiRequest("POST", "/api/email-settings/test", values);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "A test email has been sent successfully.",
      });
      setTestStatus("success");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to send test email: ${error.message}`,
        variant: "destructive",
      });
      setTestStatus("error");
    },
  });

  // Form for email settings
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
      fromEmail: "noreply@example.com",
      fromName: "Mail-in-a-Box",
      replyToEmail: "support@example.com",
      footerText: "This is an automated message, please do not reply directly to this email.",
      enabled: false,
    },
  });

  // Update form values when data is loaded
  useEffect(() => {
    if (emailSettings) {
      form.reset(emailSettings);
    }
  }, [emailSettings, form]);

  // Submit handler for email settings form
  function onSubmit(values: FormValues) {
    updateEmailSettings.mutate(values);
  }

  // Submit handler for test email form
  function sendTestEmail(values: z.infer<typeof testEmailSchema>) {
    setTestStatus("idle");
    testEmailMutation.mutate(values);
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Email Settings</h1>
        </div>

        <Tabs defaultValue="settings">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="test">Test Email</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>
                  Configure the email settings for your Mail-in-a-Box installation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SendGrid API Key</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SG.xxxxxxxxxxxxxxxxx"
                              type="password"
                              {...field}
                              disabled={updateEmailSettings.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            Your SendGrid API key. This will be stored securely.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="fromEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="noreply@example.com"
                                type="email"
                                {...field}
                                disabled={updateEmailSettings.isPending}
                              />
                            </FormControl>
                            <FormDescription>
                              The email address that will appear in the "From" field.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="fromName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>From Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Mail-in-a-Box"
                                {...field}
                                disabled={updateEmailSettings.isPending}
                              />
                            </FormControl>
                            <FormDescription>
                              The name that will appear in the "From" field.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="replyToEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reply-To Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="support@example.com"
                              type="email"
                              {...field}
                              disabled={updateEmailSettings.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            The email address that will receive replies.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="footerText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Footer Text</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="This is an automated message, please do not reply directly to this email."
                              {...field}
                              disabled={updateEmailSettings.isPending}
                              rows={3}
                            />
                          </FormControl>
                          <FormDescription>
                            Text that will appear at the bottom of all emails.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Enable Email Sending
                            </FormLabel>
                            <FormDescription>
                              Turn on email notifications and transactional emails.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={updateEmailSettings.isPending}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={updateEmailSettings.isPending}
                    >
                      {updateEmailSettings.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving Settings...
                        </>
                      ) : (
                        "Save Settings"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Send Test Email</CardTitle>
                <CardDescription>
                  Send a test email to verify your configuration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {emailSettings?.enabled ? (
                  <Form {...testEmailForm}>
                    <form onSubmit={testEmailForm.handleSubmit(sendTestEmail)} className="space-y-4">
                      <FormField
                        control={testEmailForm.control}
                        name="to"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recipient Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="your@email.com"
                                type="email"
                                {...field}
                                disabled={testEmailMutation.isPending}
                              />
                            </FormControl>
                            <FormDescription>
                              The email address that will receive the test email.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {testStatus === "success" && (
                        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900">
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <AlertTitle>Success</AlertTitle>
                          <AlertDescription>
                            Test email was sent successfully. Please check your inbox.
                          </AlertDescription>
                        </Alert>
                      )}

                      {testStatus === "error" && (
                        <Alert className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900">
                          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>
                            Failed to send test email. Please check your email settings.
                          </AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={testEmailMutation.isPending}
                      >
                        {testEmailMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending Test Email...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Test Email
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle>Email sending is disabled</AlertTitle>
                    <AlertDescription>
                      Please configure and enable email sending in the Settings tab before testing.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}