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
  const [addSpamFilterOpen, setAddSpamFilterOpen] = useState(false);
  const [addBackupJobOpen, setAddBackupJobOpen] = useState(false);
  const [selectedMailboxId, setSelectedMailboxId] = useState<number | null>(null);
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  const [selectedBackupId, setSelectedBackupId] = useState<number | null>(null);

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
  
  // Form schema for adding a spam filter
  const spamFilterFormSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    ruleType: z.enum(["header", "body", "attachment", "sender", "recipient"], {
      required_error: "Please select a rule type",
    }),
    action: z.enum(["block", "quarantine", "tag", "score"], {
      required_error: "Please select an action",
    }),
    pattern: z.string().min(2, "Pattern must be at least 2 characters"),
    description: z.string().optional(),
    score: z.number().optional(),
    isActive: z.boolean().default(true),
  });
  
  type SpamFilterFormData = z.infer<typeof spamFilterFormSchema>;
  
  // Form schema for adding a backup job
  const backupJobFormSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    backupType: z.enum(["full", "incremental", "mailboxes", "config"], {
      required_error: "Please select a backup type",
    }),
    destination: z.string().min(5, "Destination must be at least 5 characters"),
    schedule: z.string().min(3, "Schedule must be at least 3 characters"),
    retentionDays: z.number().min(1, "Retention must be at least 1 day").default(30),
    encryptionKey: z.string().optional(),
  });
  
  type BackupJobFormData = z.infer<typeof backupJobFormSchema>;

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
  
  // Fetch spam filters
  const {
    data: spamFilters = [],
    isLoading: spamFiltersLoading,
    refetch: refetchSpamFilters,
  } = useQuery({
    queryKey: [`/api/mail-servers/${serverId}/spam-filters`],
    queryFn: () => apiRequest("GET", `/api/mail-servers/${serverId}/spam-filters`).then(res => res.json()),
    enabled: !!serverId && activeTab === "security",
  });
  
  // Fetch backup jobs
  const {
    data: backupJobs = [],
    isLoading: backupJobsLoading,
    refetch: refetchBackupJobs,
  } = useQuery({
    queryKey: [`/api/mail-servers/${serverId}/backups`],
    queryFn: () => apiRequest("GET", `/api/mail-servers/${serverId}/backups`).then(res => res.json()),
    enabled: !!serverId && activeTab === "backups",
  });
  
  // Fetch backup history (for the selected backup job)
  const {
    data: backupHistory = [],
    isLoading: backupHistoryLoading,
    refetch: refetchBackupHistory,
  } = useQuery({
    queryKey: [`/api/mail-servers/${serverId}/backups/${selectedBackupId}/history`],
    queryFn: () => apiRequest("GET", `/api/mail-servers/${serverId}/backups/${selectedBackupId}/history`).then(res => res.json()),
    enabled: !!serverId && !!selectedBackupId && activeTab === "backups",
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
  
  const spamFilterForm = useForm<SpamFilterFormData>({
    resolver: zodResolver(spamFilterFormSchema),
    defaultValues: {
      name: "",
      ruleType: "header" as const,
      action: "block" as const,
      pattern: "",
      description: "",
      score: 5,
      isActive: true,
    },
  });
  
  const backupJobForm = useForm<BackupJobFormData>({
    resolver: zodResolver(backupJobFormSchema),
    defaultValues: {
      name: "",
      backupType: "full" as const,
      destination: "",
      schedule: "0 2 * * *", // Daily at 2 AM
      retentionDays: 30,
      encryptionKey: "",
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
  
  // Add a new spam filter
  const addSpamFilterMutation = useMutation({
    mutationFn: (data: SpamFilterFormData) => {
      return apiRequest("POST", `/api/mail-servers/${serverId}/spam-filters`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Spam Filter Added",
        description: "The spam filter has been created successfully.",
      });
      setAddSpamFilterOpen(false);
      spamFilterForm.reset();
      refetchSpamFilters();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add spam filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Toggle spam filter status
  const toggleSpamFilterMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number, isActive: boolean }) => {
      return apiRequest("PATCH", `/api/mail-servers/${serverId}/spam-filters/${id}`, { isActive }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Spam Filter Updated",
        description: "The spam filter status has been updated.",
      });
      refetchSpamFilters();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update spam filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete a spam filter
  const deleteSpamFilterMutation = useMutation({
    mutationFn: (filterId: number) => {
      return apiRequest("DELETE", `/api/mail-servers/${serverId}/spam-filters/${filterId}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Spam Filter Deleted",
        description: "The spam filter has been removed.",
      });
      setSelectedFilterId(null);
      refetchSpamFilters();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete spam filter",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add a new backup job
  const addBackupJobMutation = useMutation({
    mutationFn: (data: BackupJobFormData) => {
      return apiRequest("POST", `/api/mail-servers/${serverId}/backups`, data).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Backup Job Added",
        description: "The backup job has been created successfully.",
      });
      setAddBackupJobOpen(false);
      backupJobForm.reset();
      refetchBackupJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add backup job",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Run a backup job manually
  const runBackupJobMutation = useMutation({
    mutationFn: (jobId: number) => {
      return apiRequest("POST", `/api/mail-servers/${serverId}/backups/${jobId}/run`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Backup Started",
        description: "The backup job has been started. Check history for status.",
      });
      setTimeout(() => {
        refetchBackupJobs();
        if (selectedBackupId) {
          refetchBackupHistory();
        }
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start backup",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete a backup job
  const deleteBackupJobMutation = useMutation({
    mutationFn: (jobId: number) => {
      return apiRequest("DELETE", `/api/mail-servers/${serverId}/backups/${jobId}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Backup Job Deleted",
        description: "The backup job has been removed.",
      });
      setSelectedBackupId(null);
      refetchBackupJobs();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete backup job",
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
  
  // Handle spam filter form submission
  function onSpamFilterSubmit(data: SpamFilterFormData) {
    addSpamFilterMutation.mutate({
      ...data,
      serverId
    });
  }
  
  // Handle backup job form submission
  function onBackupJobSubmit(data: BackupJobFormData) {
    addBackupJobMutation.mutate({
      ...data,
      serverId
    });
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
            
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Spam Filters</div>
                  <div className="text-2xl font-bold">
                    {spamFiltersLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span className="text-green-500 font-bold">{spamFilters.filter(f => f.isActive).length}</span>
                        <span className="text-sm font-normal text-muted-foreground"> / {spamFilters.length}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Active Protection</div>
                  <div>
                    {spamFiltersLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : spamFilters.some(f => f.isActive) ? (
                      <Badge className="bg-green-500">Enabled</Badge>
                    ) : (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("security")}>
                    Manage Security
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Backups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Backup Jobs</div>
                  <div className="text-2xl font-bold">
                    {backupJobsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : backupJobs.length}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium text-muted-foreground">Last Backup</div>
                  <div className="text-sm">
                    {backupJobsLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : backupJobs.length > 0 ? (
                      backupJobs.some(job => job.lastRunAt) ? (
                        format(
                          new Date(
                            Math.max(
                              ...backupJobs
                                .filter(job => job.lastRunAt)
                                .map(job => new Date(job.lastRunAt).getTime())
                            )
                          ),
                          'MMM d, yyyy'
                        )
                      ) : (
                        'Never'
                      )
                    ) : (
                      'No backups'
                    )}
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("backups")}>
                    Manage Backups
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
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Spam Filters</h2>
              <p className="text-muted-foreground">Configure spam protection rules for your mail server</p>
            </div>
            
            <Dialog open={addSpamFilterOpen} onOpenChange={setAddSpamFilterOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Spam Filter
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Add New Spam Filter</DialogTitle>
                  <DialogDescription>
                    Create a filter rule to protect your server from spam
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...spamFilterForm}>
                  <form onSubmit={spamFilterForm.handleSubmit(onSpamFilterSubmit)} className="space-y-4">
                    <FormField
                      control={spamFilterForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Block Known Spammers" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this filter
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={spamFilterForm.control}
                        name="ruleType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rule Type</FormLabel>
                            <FormControl>
                              <select 
                                className="w-full border border-input bg-background px-3 py-2 rounded-md"
                                {...field}
                              >
                                <option value="header">Email Header</option>
                                <option value="body">Email Body</option>
                                <option value="attachment">Attachment</option>
                                <option value="sender">Sender Address</option>
                                <option value="recipient">Recipient Address</option>
                              </select>
                            </FormControl>
                            <FormDescription>
                              What part of the email to filter
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={spamFilterForm.control}
                        name="action"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Action</FormLabel>
                            <FormControl>
                              <select 
                                className="w-full border border-input bg-background px-3 py-2 rounded-md"
                                {...field}
                              >
                                <option value="block">Block</option>
                                <option value="quarantine">Quarantine</option>
                                <option value="tag">Tag</option>
                                <option value="score">Score</option>
                              </select>
                            </FormControl>
                            <FormDescription>
                              What to do when this filter matches
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={spamFilterForm.control}
                      name="pattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pattern</FormLabel>
                          <FormControl>
                            <Input placeholder="spam|viagra|casino" {...field} />
                          </FormControl>
                          <FormDescription>
                            Pattern to match (regex supported)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={spamFilterForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Input placeholder="Optional description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {spamFilterForm.watch('action') === 'score' && (
                        <FormField
                          control={spamFilterForm.control}
                          name="score"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Score</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  max="10" 
                                  placeholder="5" 
                                  {...field}
                                  onChange={(e) => {
                                    const value = e.target.value === "" ? "0" : e.target.value;
                                    field.onChange(parseInt(value, 10));
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                Spam score (1-10)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                    
                    <FormField
                      control={spamFilterForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Enable Filter</FormLabel>
                            <FormDescription>
                              Set to active immediately
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addSpamFilterMutation.isPending}>
                        {addSpamFilterMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Add Filter
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {spamFiltersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : spamFilters?.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Spam Filters</CardTitle>
                <CardDescription>
                  You haven't created any spam filters yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Spam filters help protect your mail server from unwanted messages.
                </p>
                <Button onClick={() => setAddSpamFilterOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Filter
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Active Spam Filters</CardTitle>
                <CardDescription>
                  {spamFilters.filter(filter => filter.isActive).length} of {spamFilters.length} filters currently active
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Rule Type</TableHead>
                      <TableHead>Pattern</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {spamFilters.map((filter) => (
                      <TableRow key={filter.id}>
                        <TableCell className="font-medium">{filter.name}</TableCell>
                        <TableCell className="capitalize">{filter.ruleType}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{filter.pattern}</TableCell>
                        <TableCell className="capitalize">{filter.action}</TableCell>
                        <TableCell>
                          {filter.isActive ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => toggleSpamFilterMutation.mutate({ 
                                      id: filter.id, 
                                      isActive: !filter.isActive 
                                    })}
                                    disabled={toggleSpamFilterMutation.isPending}
                                  >
                                    {toggleSpamFilterMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : filter.isActive ? (
                                      <Lock className="h-4 w-4" />
                                    ) : (
                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {filter.isActive ? 'Disable' : 'Enable'} filter
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-8 w-8">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Spam Filter</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{filter.name}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => deleteSpamFilterMutation.mutate(filter.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="backups" className="mt-6">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Backup Jobs</h2>
              <p className="text-muted-foreground">Configure automated backup jobs for your mail server</p>
            </div>
            
            <Dialog open={addBackupJobOpen} onOpenChange={setAddBackupJobOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Backup Job
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                  <DialogTitle>Add New Backup Job</DialogTitle>
                  <DialogDescription>
                    Create an automated backup job for your mail server
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...backupJobForm}>
                  <form onSubmit={backupJobForm.handleSubmit(onBackupJobSubmit)} className="space-y-4">
                    <FormField
                      control={backupJobForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Daily Full Backup" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for this backup job
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={backupJobForm.control}
                        name="backupType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Backup Type</FormLabel>
                            <FormControl>
                              <select 
                                className="w-full border border-input bg-background px-3 py-2 rounded-md"
                                {...field}
                              >
                                <option value="full">Full Backup</option>
                                <option value="incremental">Incremental</option>
                                <option value="mailboxes">Mailboxes Only</option>
                                <option value="config">Configuration Only</option>
                              </select>
                            </FormControl>
                            <FormDescription>
                              What to include in the backup
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={backupJobForm.control}
                        name="schedule"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Schedule (Cron)</FormLabel>
                            <FormControl>
                              <Input placeholder="0 2 * * *" {...field} />
                            </FormControl>
                            <FormDescription>
                              Cron expression for scheduling
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={backupJobForm.control}
                      name="destination"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destination</FormLabel>
                          <FormControl>
                            <Input placeholder="s3://my-bucket/backups/" {...field} />
                          </FormControl>
                          <FormDescription>
                            Where backups will be stored (local path, S3, etc.)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={backupJobForm.control}
                        name="retentionDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Retention (Days)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                placeholder="30" 
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? "30" : e.target.value;
                                  field.onChange(parseInt(value, 10));
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Days to keep backups
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={backupJobForm.control}
                        name="encryptionKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Encryption Key (Optional)</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Optional encryption key" {...field} />
                            </FormControl>
                            <FormDescription>
                              For encrypted backups
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button type="submit" disabled={addBackupJobMutation.isPending}>
                        {addBackupJobMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4" />
                        )}
                        Add Backup Job
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          {backupJobsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : backupJobs?.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Backup Jobs</CardTitle>
                <CardDescription>
                  You haven't created any backup jobs yet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Automated backups help protect your mail server data against loss.
                </p>
                <Button onClick={() => setAddBackupJobOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Backup Job
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduled Backup Jobs</CardTitle>
                  <CardDescription>
                    {backupJobs.length} backup job{backupJobs.length !== 1 ? 's' : ''} configured
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Schedule</TableHead>
                        <TableHead>Last Run</TableHead>
                        <TableHead>Next Run</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {backupJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{job.name}</span>
                              {job.status === 'running' && (
                                <Badge className="bg-blue-500">Running</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{job.backupType}</TableCell>
                          <TableCell>{job.schedule}</TableCell>
                          <TableCell>
                            {job.lastRunAt 
                              ? format(new Date(job.lastRunAt), 'MMM d, yyyy h:mm a') 
                              : 'Never'}
                          </TableCell>
                          <TableCell>
                            {job.nextRunAt 
                              ? format(new Date(job.nextRunAt), 'MMM d, yyyy h:mm a') 
                              : 'Not scheduled'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setSelectedBackupId(job.id === selectedBackupId ? null : job.id);
                                      }}
                                    >
                                      <HardDrive className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    View backup history
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => runBackupJobMutation.mutate(job.id)}
                                      disabled={job.status === 'running' || runBackupJobMutation.isPending}
                                    >
                                      {job.status === 'running' || runBackupJobMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Run backup now
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Backup Job</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{job.name}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteBackupJobMutation.mutate(job.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                </CardContent>
              </Card>
              
              {selectedBackupId && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Backup History</CardTitle>
                      <CardDescription>
                        Recent backup runs and their status
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedBackupId(null)}>
                      Hide History
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {backupHistoryLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : backupHistory?.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground">
                        No backup history found for this job
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Started At</TableHead>
                            <TableHead>Completed At</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {backupHistory.map((entry) => (
                            <TableRow key={entry.id}>
                              <TableCell>
                                {format(new Date(entry.startedAt), 'MMM d, yyyy h:mm a')}
                              </TableCell>
                              <TableCell>
                                {entry.completedAt 
                                  ? format(new Date(entry.completedAt), 'MMM d, yyyy h:mm a') 
                                  : 'In progress'}
                              </TableCell>
                              <TableCell>
                                {entry.status === 'completed' ? (
                                  <Badge className="bg-green-500">Completed</Badge>
                                ) : entry.status === 'failed' ? (
                                  <Badge variant="destructive">Failed</Badge>
                                ) : entry.status === 'running' ? (
                                  <Badge className="bg-blue-500">Running</Badge>
                                ) : (
                                  <Badge variant="outline">{entry.status}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {entry.sizeBytes 
                                  ? `${(entry.sizeBytes / (1024 * 1024)).toFixed(2)} MB` 
                                  : '-'}
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate text-red-500">
                                {entry.error || '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
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