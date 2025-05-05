import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Loader, 
  ChevronRight, 
  Plus, 
  DollarSign, 
  PieChart, 
  Users, 
  Settings, 
  Copy, 
  Mail, 
  Calendar 
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatCurrency } from "@/lib/utils";

// Form schema for reseller settings
const resellerSettingsSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  supportEmail: z.string().email("Must be a valid email").optional().nullable(),
  customDomain: z.string().optional().nullable(),
  primaryColor: z.string().default("#4f46e5"),
  accentColor: z.string().default("#10b981"),
  whiteLabel: z.boolean().default(false),
  commissionRate: z.number().min(0, "Commission rate must be at least 0").max(100, "Commission rate cannot exceed 100%"),
  maxCustomers: z.number().min(1, "Max customers must be at least 1"),
  maxDomainsPerCustomer: z.number().min(1, "Max domains per customer must be at least 1"),
  maxEmailsPerDomain: z.number().min(1, "Max emails per domain must be at least 1")
});

// Form schema for commission tier
const commissionTierSchema = z.object({
  tierName: z.string().min(1, "Tier name is required"),
  minimumRevenue: z.number().min(0, "Minimum revenue must be at least 0"),
  commissionRate: z.number().min(1, "Commission rate must be at least 1").max(100, "Commission rate cannot exceed 100%")
});

// Form schema for new customer
const newCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must be a valid email"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  customId: z.string().optional().nullable()
});

export default function ResellerDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [isNewTierDialogOpen, setIsNewTierDialogOpen] = useState(false);

  // Fetch user data with reseller info
  const { data: userData, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/me"],
  });

  // Fetch reseller customers
  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ["/api/reseller/customers"],
    enabled: !!userData?.isReseller,
  });

  // Reseller settings form
  const settingsForm = useForm<z.infer<typeof resellerSettingsSchema>>({
    resolver: zodResolver(resellerSettingsSchema),
    defaultValues: {
      companyName: "",
      supportEmail: "",
      customDomain: "",
      primaryColor: "#4f46e5",
      accentColor: "#10b981",
      whiteLabel: false,
      commissionRate: 10,
      maxCustomers: 100,
      maxDomainsPerCustomer: 5,
      maxEmailsPerDomain: 10
    },
  });

  // Commission tier form
  const tierForm = useForm<z.infer<typeof commissionTierSchema>>({
    resolver: zodResolver(commissionTierSchema),
    defaultValues: {
      tierName: "",
      minimumRevenue: 0,
      commissionRate: 5
    },
  });

  // New customer form
  const customerForm = useForm<z.infer<typeof newCustomerSchema>>({
    resolver: zodResolver(newCustomerSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      customId: ""
    },
  });

  // Load settings data into form when available
  useEffect(() => {
    if (userData?.resellerData?.settings) {
      const settings = userData.resellerData.settings;
      settingsForm.reset({
        companyName: settings.companyName || "",
        supportEmail: settings.supportEmail || "",
        customDomain: settings.customDomain || "",
        primaryColor: settings.primaryColor || "#4f46e5",
        accentColor: settings.accentColor || "#10b981",
        whiteLabel: settings.whiteLabel || false,
        commissionRate: settings.commissionRate || 10,
        maxCustomers: settings.maxCustomers || 100,
        maxDomainsPerCustomer: settings.maxDomainsPerCustomer || 5,
        maxEmailsPerDomain: settings.maxEmailsPerDomain || 10
      });
    }
  }, [userData, settingsForm]);

  // Update reseller settings
  const onUpdateSettings = async (values: z.infer<typeof resellerSettingsSchema>) => {
    try {
      await apiRequest("PATCH", "/api/reseller/settings", values);
      toast({
        title: "Settings Updated",
        description: "Your reseller settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setIsSettingsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to update settings:", error);
    }
  };

  // Create new commission tier
  const onCreateTier = async (values: z.infer<typeof commissionTierSchema>) => {
    try {
      await apiRequest("POST", "/api/reseller/commission-tiers", values);
      toast({
        title: "Commission Tier Created",
        description: "Your new commission tier has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setIsNewTierDialogOpen(false);
      tierForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create commission tier. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to create commission tier:", error);
    }
  };

  // Create new customer
  const onCreateCustomer = async (values: z.infer<typeof newCustomerSchema>) => {
    try {
      await apiRequest("POST", "/api/reseller/customers", values);
      toast({
        title: "Customer Created",
        description: "New customer account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reseller/customers"] });
      setIsNewCustomerDialogOpen(false);
      customerForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to create customer:", error);
    }
  };

  // Register as a reseller
  const registerAsReseller = async () => {
    try {
      const values = {
        companyName: "My Reseller Business",
        supportEmail: userData?.email || ""
      };
      
      await apiRequest("POST", "/api/reseller/register", values);
      toast({
        title: "Reseller Account Created",
        description: "Your reseller account has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create reseller account. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to create reseller account:", error);
    }
  };

  if (isUserLoading) {
    return (
      <MainLayout pageTitle="Reseller Dashboard">
        <div className="flex items-center justify-center h-[50vh]">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // If not a reseller, show reseller registration prompt
  if (!userData?.isReseller) {
    return (
      <MainLayout pageTitle="Become a Reseller">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Become a Mail-in-a-Box Reseller</CardTitle>
              <CardDescription>
                Start your own email hosting business by reselling Mail-in-a-Box services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <h3 className="text-lg font-medium">Benefits of becoming a reseller:</h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Create your own branded email hosting service</li>
                <li>Manage customers under your own brand</li>
                <li>Earn commissions on all customer subscriptions</li>
                <li>Set your own pricing and profit margins</li>
                <li>Access to white-label options and custom domains</li>
              </ul>
              
              <div className="pt-4">
                <Button onClick={registerAsReseller}>Register as Reseller</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Reseller Dashboard">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{userData?.resellerData?.settings?.companyName || "Reseller Dashboard"}</h1>
        <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  {userData?.resellerData?.customerCount || 0}
                  <span className="text-xs text-muted-foreground ml-2">
                    / {userData?.resellerData?.settings?.maxCustomers || 100}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Commission Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  <PieChart className="h-4 w-4 mr-2 text-muted-foreground" />
                  {userData?.resellerData?.settings?.commissionRate || 10}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                  {formatCurrency(0)} {/* Replace with actual revenue data */}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your recent reseller activities</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activities to display.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Your Customers</h2>
            <Button onClick={() => setIsNewCustomerDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {isCustomersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : customers && customers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Custom ID</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.username}</TableCell>
                        <TableCell>{customer.resellerCustomId || "-"}</TableCell>
                        <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={customer.stripeSubscriptionId ? "default" : "outline"}>
                            {customer.stripeSubscriptionId ? "Active" : "No Subscription"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            Manage
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No customers found.</p>
                  <Button onClick={() => setIsNewCustomerDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Customer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions Tab */}
        <TabsContent value="commissions" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Commission Tiers</h2>
              <p className="text-sm text-muted-foreground">Manage your commission structure based on revenue tiers</p>
            </div>
            <Button onClick={() => setIsNewTierDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {userData?.resellerData?.tiers && userData.resellerData.tiers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier Name</TableHead>
                      <TableHead>Minimum Revenue</TableHead>
                      <TableHead>Commission Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userData.resellerData.tiers.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-medium">{tier.tierName}</TableCell>
                        <TableCell>{formatCurrency(tier.minimumRevenue)}</TableCell>
                        <TableCell>{tier.commissionRate}%</TableCell>
                        <TableCell>
                          <Badge variant={tier.isActive ? "default" : "outline"}>
                            {tier.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground mb-4">No commission tiers found.</p>
                  <Button onClick={() => setIsNewTierDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Tier
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commission Analytics</CardTitle>
              <CardDescription>Track your earning performance</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => {
                  setActiveTab("analytics");
                }}
              >
                View Detailed Analytics Dashboard
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Import and use the analytics component here */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
                <CardDescription>Detailed reseller business metrics and performance analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-6">
                  <p className="text-center text-muted-foreground">Loading analytics dashboard...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">White Labeling</h2>
              <p className="text-sm text-muted-foreground">Configure your custom branding and client portal</p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Client Portal URL</CardTitle>
              <CardDescription>Share this URL with your customers to access your branded portal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex">
                <Input 
                  value={`${window.location.origin}/client-portal?reseller=${userData?.id || "unknown"}`}
                  readOnly
                  className="flex-1 rounded-r-none"
                />
                <Button 
                  variant="secondary"
                  className="rounded-l-none"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/client-portal?reseller=${userData?.id || "unknown"}`);
                    toast({
                      title: "URL Copied",
                      description: "Portal URL has been copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">This is a temporary URL. Configure your white label settings for a custom domain.</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>White Label Configuration</CardTitle>
              <CardDescription>Customize the branding for your customer portal</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Configure White Label Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Email Templates</h2>
              <p className="text-sm text-muted-foreground">Create branded email templates for your customers</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-0">
              <div className="p-6 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Email Templates Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create branded email templates that you and your customers can use for communications.
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Commission Payouts</h2>
              <p className="text-sm text-muted-foreground">Track and manage your commission earnings</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Pending Commission</span>
                  <span className="text-2xl font-bold">{formatCurrency(0)}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Minimum payout: {formatCurrency(100)}
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardContent className="p-4">
                <div className="flex justify-between items-center h-full">
                  <div className="text-sm">
                    <p className="font-medium">Next Payout</p>
                    <p className="text-muted-foreground">
                      You need {formatCurrency(100)} more to reach minimum payout threshold
                    </p>
                  </div>
                  <Button disabled={true} className="ml-4">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request Payout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Record of your commission payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Payout History</h3>
                <p className="text-sm text-muted-foreground">
                  Your commission payment history will appear here once you start earning commissions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Reseller Resources</CardTitle>
              <CardDescription>Tools and materials to help grow your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Marketing Materials</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Email hosting brochures and sales sheets</li>
                  <li>Product comparison templates</li>
                  <li>Sample pricing strategies</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Technical Resources</h3>
                <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                  <li>Technical documentation for customers</li>
                  <li>Email setup guides</li>
                  <li>Troubleshooting and support documentation</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium mb-2">Whitelabeling</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {userData?.resellerData?.settings?.whiteLabel 
                    ? "You have white-labeling enabled. You can customize your branding in the settings."
                    : "White-labeling allows you to completely customize the branding of the email service."}
                </p>
                {!userData?.resellerData?.settings?.whiteLabel && (
                  <Button variant="outline" onClick={() => setIsSettingsDialogOpen(true)}>
                    Enable White-Labeling
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Settings Dialog */}
      <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reseller Settings</DialogTitle>
            <DialogDescription>
              Configure your reseller account settings
            </DialogDescription>
          </DialogHeader>
          <Form {...settingsForm}>
            <form onSubmit={settingsForm.handleSubmit(onUpdateSettings)} className="space-y-4">
              <FormField
                control={settingsForm.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={settingsForm.control}
                name="supportEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Support Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={settingsForm.control}
                name="customDomain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Domain</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="app.yourcompany.com" />
                    </FormControl>
                    <FormDescription>
                      Domain used for your white-labeled control panel
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={settingsForm.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <div className="flex space-x-2">
                        <div 
                          className="w-8 h-8 rounded-full border"
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input {...field} type="text" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={settingsForm.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <div className="flex space-x-2">
                        <div 
                          className="w-8 h-8 rounded-full border"
                          style={{ backgroundColor: field.value }}
                        />
                        <FormControl>
                          <Input {...field} type="text" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <FormField
                control={settingsForm.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Commission Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={settingsForm.control}
                  name="maxCustomers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Customers</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={settingsForm.control}
                  name="maxDomainsPerCustomer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Domains</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={settingsForm.control}
                  name="maxEmailsPerDomain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Emails</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={isNewCustomerDialogOpen} onOpenChange={setIsNewCustomerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer account under your reseller profile
            </DialogDescription>
          </DialogHeader>
          <Form {...customerForm}>
            <form onSubmit={customerForm.handleSubmit(onCreateCustomer)} className="space-y-4">
              <FormField
                control={customerForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customerForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customerForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={customerForm.control}
                name="customId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom ID (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                    <FormDescription>
                      Your own reference ID for this customer
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">Create Customer</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* New Commission Tier Dialog */}
      <Dialog open={isNewTierDialogOpen} onOpenChange={setIsNewTierDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Commission Tier</DialogTitle>
            <DialogDescription>
              Create a new commission tier for your reseller program
            </DialogDescription>
          </DialogHeader>
          <Form {...tierForm}>
            <form onSubmit={tierForm.handleSubmit(onCreateTier)} className="space-y-4">
              <FormField
                control={tierForm.control}
                name="tierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tier Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Silver, Gold, Platinum" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={tierForm.control}
                name="minimumRevenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Revenue (in cents)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Monthly revenue threshold for this tier (in cents)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={tierForm.control}
                name="commissionRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Commission Rate (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="submit">Create Tier</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}