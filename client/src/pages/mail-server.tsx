import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { 
  Loader2, 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Mail, 
  Lock, 
  Globe, 
  Shield, 
  HardDrive, 
  Activity,
  ChevronRight,
  Settings,
  FileCog
} from "lucide-react";

export default function MailServerPage() {
  const { toast } = useToast();
  const [, params] = useRoute<{ id: string }>("/mail-server/:id");
  const serverId = params?.id ? parseInt(params.id) : 0;
  const [activeTab, setActiveTab] = useState("overview");
  const [addMailboxOpen, setAddMailboxOpen] = useState(false);
  const [addAliasOpen, setAddAliasOpen] = useState(false);
  const [selectedMailboxId, setSelectedMailboxId] = useState<number | null>(null);

  // Form schema for adding a mailbox
  const mailboxFormSchema = z.object({
    email: z.string().email("Must be a valid email"),
    name: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

  type MailboxFormData = z.infer<typeof mailboxFormSchema>;

  // Form schema for adding an email alias
  const aliasFormSchema = z.object({
    sourceEmail: z.string().email("Must be a valid email"),
    destinationEmail: z.string().email("Must be a valid email"),
    mailboxId: z.number().optional(),
  });

  type AliasFormData = z.infer<typeof aliasFormSchema>;

  // Fetch server details
  const { 
    data: server, 
    isLoading: serverLoading,
    error: serverError,
  } = useQuery({
    queryKey: [`/api/mail-servers/${serverId}`],
    queryFn: () => apiRequest("GET", `/api/mail-servers/${serverId}`).then(res => res.json()),
    enabled: !!serverId,
  });

  // Fetch mailboxes
  const {
    data: mailboxes = [],
    isLoading: mailboxesLoading,
    refetch: refetchMailboxes,
  } = useQuery({
    queryKey: [`/api/mail-servers/${serverId}/mailboxes`],
    queryFn: () => apiRequest("GET", `/api/mail-servers/${serverId}/mailboxes`).then(res => res.json()),
    enabled: !!serverId && activeTab === "mailboxes",
  });

  // Fetch email aliases
  const {
    data: aliases = [],
    isLoading: aliasesLoading,
    refetch: refetchAliases,
  } = useQuery({
    queryKey: [`/api/mail-servers/${serverId}/aliases`],
    queryFn: () => apiRequest("GET", `/api/mail-servers/${serverId}/aliases`).then(res => res.json()),
    enabled: !!serverId && activeTab === "aliases",
  });

  // Fetch DNS records
  const {
    data: dnsRecords = [],
    isLoading: dnsLoading,
    refetch: refetchDns,
  } = useQuery({
    queryKey: [`/api/mail-servers/${serverId}/dns`],
    queryFn: () => apiRequest("GET", `/api/mail-servers/${serverId}/dns`).then(res => res.json()),
    enabled: !!serverId && activeTab === "dns",
  });

  // Forms
  const mailboxForm = useForm<MailboxFormData>({
    resolver: zodResolver(mailboxFormSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
    },
  });

  const aliasForm = useForm<AliasFormData>({
    resolver: zodResolver(aliasFormSchema),
    defaultValues: {
      sourceEmail: "",
      destinationEmail: "",
      mailboxId: undefined,
    },
  });

  // Add a new mailbox
  const addMailboxMutation = useMutation({
    mutationFn: (data: MailboxFormData) => {
      return apiRequest("POST", `/api/mail-servers/${serverId}/mailboxes`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Mailbox Added",
        description: "The mailbox has been created successfully.",
      });
      setAddMailboxOpen(false);
      mailboxForm.reset();
      refetchMailboxes();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add mailbox",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add a new email alias
  const addAliasMutation = useMutation({
    mutationFn: (data: AliasFormData) => {
      return apiRequest("POST", `/api/mail-servers/${serverId}/aliases`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Email Alias Added",
        description: "The email alias has been created successfully.",
      });
      setAddAliasOpen(false);
      aliasForm.reset();
      refetchAliases();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add email alias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh server status
  const refreshServerMutation = useMutation({
    mutationFn: () => {
      return apiRequest("POST", `/api/mail-servers/${serverId}/sync`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Server Refreshed",
        description: "The server status and data have been refreshed.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/mail-servers/${serverId}`] });
      
      if (activeTab === "mailboxes") refetchMailboxes();
      if (activeTab === "aliases") refetchAliases();
      if (activeTab === "dns") refetchDns();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to refresh server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete a mailbox
  const deleteMailboxMutation = useMutation({
    mutationFn: (mailboxId: number) => {
      return apiRequest("DELETE", `/api/mail-servers/${serverId}/mailboxes/${mailboxId}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Mailbox Deleted",
        description: "The mailbox has been removed.",
      });
      setSelectedMailboxId(null);
      refetchMailboxes();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete mailbox",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete an email alias
  const deleteAliasMutation = useMutation({
    mutationFn: (aliasId: number) => {
      return apiRequest("DELETE", `/api/mail-servers/${serverId}/aliases/${aliasId}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Email Alias Deleted",
        description: "The email alias has been removed.",
      });
      refetchAliases();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete alias",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle mailbox form submission
  function onMailboxSubmit(data: MailboxFormData) {
    addMailboxMutation.mutate(data);
  }

  // Handle alias form submission
  function onAliasSubmit(data: AliasFormData) {
    addAliasMutation.mutate(data);
  }

  // Function to get status badge color
  function getStatusBadge(status: string) {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'active':
      case 'connected':
        return <Badge className="bg-green-500">{status}</Badge>;
      case 'error':
      case 'offline':
        return <Badge variant="destructive">{status}</Badge>;
      case 'unknown':
        return <Badge variant="outline">{status}</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Unknown'}</Badge>;
    }
  }

  if (serverLoading) {
    return (
      <div className="container py-10 flex justify-center items-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (serverError || !server) {
    return (
      <div className="container py-10">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Server Not Found</h2>
          <p className="text-muted-foreground">The requested server could not be found or an error occurred.</p>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => window.open('/mail-servers', '_self')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Servers
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{server.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">{server.hostname}</span>
              <span>{getStatusBadge(server.status)}</span>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => refreshServerMutation.mutate()}
          disabled={refreshServerMutation.isPending}
        >
          {refreshServerMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="mailboxes" className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            <span>Mailboxes</span>
          </TabsTrigger>
          <TabsTrigger value="aliases" className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" />
            <span>Aliases</span>
          </TabsTrigger>
          <TabsTrigger value="dns" className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span>DNS</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="backups" className="flex items-center gap-1">
            <HardDrive className="h-4 w-4" />
            <span>Backups</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Server Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                  <div>{getStatusBadge(server.status)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Hostname</div>
                  <div>{server.hostname}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Version</div>
                  <div>{server.version || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">Last Synced</div>
                  <div>
                    {server.lastSyncedAt 
                      ? format(new Date(server.lastSyncedAt), 'MMM d, yyyy h:mm a') 
                      : 'Never'}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Accounts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Mailboxes</div>
                  <div className="text-2xl font-bold">
                    {mailboxesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : mailboxes?.length || 0}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Aliases</div>
                  <div className="text-2xl font-bold">
                    {aliasesLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : aliases?.length || 0}
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("mailboxes")}>
                    Manage Accounts
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>DNS Records</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Total Records</div>
                  <div className="text-2xl font-bold">
                    {dnsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : dnsRecords?.length || 0}
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("dns")}>
                    View DNS Records
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mailboxes" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Mailboxes</h2>
            <Dialog open={addMailboxOpen} onOpenChange={setAddMailboxOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Mailbox
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Mailbox</DialogTitle>
                  <DialogDescription>
                    Create a new email mailbox on your Mail-in-a-Box server.
                  </DialogDescription>
                </DialogHeader>
                <Form {...mailboxForm}>
                  <form onSubmit={mailboxForm.handleSubmit(onMailboxSubmit)} className="space-y-4">
                    <FormField
                      control={mailboxForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="user@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The email address for this mailbox.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={mailboxForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormDescription>
                            The display name for this mailbox.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={mailboxForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="********" {...field} />
                          </FormControl>
                          <FormDescription>
                            Password must be at least 8 characters.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={addMailboxMutation.isPending}>
                        {addMailboxMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Mailbox
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {mailboxesLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : mailboxes.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No mailboxes found</CardTitle>
                <CardDescription>
                  You haven't added any mailboxes to this server yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-8 text-muted-foreground">
                  Add your first mailbox to start sending and receiving emails.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={() => setAddMailboxOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Mailbox
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email Address</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Storage Used</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mailboxes.map((mailbox: any) => (
                      <TableRow key={mailbox.id}>
                        <TableCell className="font-medium">{mailbox.email}</TableCell>
                        <TableCell>{mailbox.name || '-'}</TableCell>
                        <TableCell>{getStatusBadge(mailbox.status)}</TableCell>
                        <TableCell>
                          {Math.round(mailbox.storageUsed / 1024 / 1024)} MB
                        </TableCell>
                        <TableCell>
                          {mailbox.lastLogin 
                            ? format(new Date(mailbox.lastLogin), 'MMM d, yyyy h:mm a') 
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => alert('Reset password functionality')}
                                  >
                                    <Lock className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Reset password</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <AlertDialog open={selectedMailboxId === mailbox.id} onOpenChange={(open) => !open && setSelectedMailboxId(null)}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-red-500"
                                  onClick={() => setSelectedMailboxId(mailbox.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Mailbox</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this mailbox? All emails in this mailbox will be permanently lost.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => deleteMailboxMutation.mutate(mailbox.id)}
                                    disabled={deleteMailboxMutation.isPending}
                                  >
                                    {deleteMailboxMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="aliases" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Email Aliases</h2>
            <Dialog open={addAliasOpen} onOpenChange={setAddAliasOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Alias
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add Email Alias</DialogTitle>
                  <DialogDescription>
                    Create a new email alias to forward emails to another address.
                  </DialogDescription>
                </DialogHeader>
                <Form {...aliasForm}>
                  <form onSubmit={aliasForm.handleSubmit(onAliasSubmit)} className="space-y-4">
                    <FormField
                      control={aliasForm.control}
                      name="sourceEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source Email</FormLabel>
                          <FormControl>
                            <Input placeholder="alias@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The alias email address that receives emails.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={aliasForm.control}
                      name="destinationEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination Email</FormLabel>
                          <FormControl>
                            <Input placeholder="target@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The email address where emails will be forwarded.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={addAliasMutation.isPending}>
                        {addAliasMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Alias
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {aliasesLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : aliases.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No email aliases found</CardTitle>
                <CardDescription>
                  You haven't added any email aliases to this server yet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-8 text-muted-foreground">
                  Add your first email alias to forward emails to another address.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button onClick={() => setAddAliasOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Email Alias
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source Email</TableHead>
                      <TableHead>Destination Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mailbox</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aliases.map((alias: any) => (
                      <TableRow key={alias.id}>
                        <TableCell className="font-medium">{alias.sourceEmail}</TableCell>
                        <TableCell>{alias.destinationEmail}</TableCell>
                        <TableCell>{alias.isActive ? <Badge className="bg-green-500">Active</Badge> : <Badge variant="destructive">Inactive</Badge>}</TableCell>
                        <TableCell>{alias.mailboxId ? 'Linked' : 'External'}</TableCell>
                        <TableCell>
                          {alias.expiresAt 
                            ? format(new Date(alias.expiresAt), 'MMM d, yyyy') 
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Email Alias</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this email alias? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    className="bg-red-500 hover:bg-red-600"
                                    onClick={() => deleteAliasMutation.mutate(alias.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="dns" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">DNS Records</h2>
            <Button 
              variant="outline"
              onClick={() => refetchDns()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Records
            </Button>
          </div>

          {dnsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : dnsRecords.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No DNS records found</CardTitle>
                <CardDescription>
                  No DNS records were found for this server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-8 text-muted-foreground">
                  This could mean the server doesn't have any DNS records configured or there was an error fetching them.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>TTL</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Managed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dnsRecords.map((record: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{record.name}</TableCell>
                        <TableCell>{record.recordType}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-default">
                                {record.value}
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-[300px] break-all">{record.value}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>{record.ttl}</TableCell>
                        <TableCell>{record.priority || '-'}</TableCell>
                        <TableCell>
                          {record.isManaged ? (
                            <Badge className="bg-blue-500">Managed</Badge>
                          ) : (
                            <Badge variant="outline">Custom</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage security settings for your Mail-in-a-Box server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Security management interface is being built. Check back later.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Backups</CardTitle>
              <CardDescription>
                Manage backups for your Mail-in-a-Box server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Backup management interface is being built. Check back later.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Server Settings</CardTitle>
              <CardDescription>
                Manage settings for your Mail-in-a-Box server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Server settings interface is being built. Check back later.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}