import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, RefreshCw, Server, Trash2, ExternalLink, Check, X, ShieldAlert } from "lucide-react";

// Define the validation schema for adding a new server
const serverFormSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  hostname: z.string().min(1, "Hostname is required"),
  apiUrl: z.string().url("Must be a valid URL"),
  apiKey: z.string().min(1, "API key is required"),
});

type ServerFormData = z.infer<typeof serverFormSchema>;

export default function MailServersPage() {
  const { toast } = useToast();
  const [addServerOpen, setAddServerOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<number | null>(null);

  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      name: "",
      hostname: "",
      apiUrl: "",
      apiKey: "",
    },
  });

  // Fetch servers
  const { 
    data: servers = [], 
    isLoading, 
    refetch 
  } = useQuery({
    queryKey: ["/api/mail-servers"],
    queryFn: () => apiRequest("GET", "/api/mail-servers").then(res => res.json()),
  });

  // Add a new server
  const addServerMutation = useMutation({
    mutationFn: (data: ServerFormData) => {
      return apiRequest("POST", "/api/mail-servers", {
        name: data.name,
        hostname: data.hostname,
        apiUrl: data.apiUrl,
        apiKey: data.apiKey,
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Server Added",
        description: "The Mail-in-a-Box server has been added successfully.",
      });
      setAddServerOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/mail-servers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete a server
  const deleteServerMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("DELETE", `/api/mail-servers/${id}`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Server Deleted",
        description: "The Mail-in-a-Box server has been deleted.",
      });
      setServerToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["/api/mail-servers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refresh server status
  const refreshServerMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("POST", `/api/mail-servers/${id}/sync`).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Server Refreshed",
        description: "The server status has been refreshed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mail-servers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to refresh server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  function onSubmit(data: ServerFormData) {
    addServerMutation.mutate(data);
  }

  // Function to get status badge color
  function getStatusBadge(status: string) {
    switch (status.toLowerCase()) {
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
        return <Badge variant="secondary">{status}</Badge>;
    }
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Mail-in-a-Box Servers</h1>
          <p className="text-muted-foreground mt-2">
            Manage your Mail-in-a-Box servers and configurations
          </p>
        </div>
        <Dialog open={addServerOpen} onOpenChange={setAddServerOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Server
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Mail-in-a-Box Server</DialogTitle>
              <DialogDescription>
                Connect to your Mail-in-a-Box server by providing the server details below.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Primary Mail Server" {...field} />
                      </FormControl>
                      <FormDescription>
                        A friendly name to identify this server.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hostname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hostname</FormLabel>
                      <FormControl>
                        <Input placeholder="mail.example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        The hostname of your Mail-in-a-Box server.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://mail.example.com/admin" {...field} />
                      </FormControl>
                      <FormDescription>
                        The admin API URL of your Mail-in-a-Box server.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Key</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Your Mail-in-a-Box API key" {...field} />
                      </FormControl>
                      <FormDescription>
                        The admin API key for authentication.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={addServerMutation.isPending}>
                    {addServerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Server
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator className="my-6" />

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No servers found</CardTitle>
            <CardDescription>
              You haven't added any Mail-in-a-Box servers yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center py-8 text-muted-foreground">
              Add your first Mail-in-a-Box server to start managing your email infrastructure.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <DialogTrigger asChild>
              <Button onClick={() => setAddServerOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Server
              </Button>
            </DialogTrigger>
          </CardFooter>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Last Synced</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {servers.map((server: any) => (
                  <TableRow key={server.id}>
                    <TableCell className="font-medium">{server.name}</TableCell>
                    <TableCell>{server.hostname}</TableCell>
                    <TableCell>{getStatusBadge(server.status)}</TableCell>
                    <TableCell>{server.version || 'Unknown'}</TableCell>
                    <TableCell>
                      {server.lastSyncedAt 
                        ? format(new Date(server.lastSyncedAt), 'MMM d, yyyy h:mm a') 
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
                                onClick={() => refreshServerMutation.mutate(server.id)}
                                disabled={refreshServerMutation.isPending}
                              >
                                {refreshServerMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Refresh server status</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => window.open(`/mail-server/${server.id}`, '_self')}
                              >
                                <Server className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage server</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <AlertDialog open={serverToDelete === server.id} onOpenChange={(open) => !open && setServerToDelete(null)}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-500"
                              onClick={() => setServerToDelete(server.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Server</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this server? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => deleteServerMutation.mutate(server.id)}
                                disabled={deleteServerMutation.isPending}
                              >
                                {deleteServerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    </div>
  );
}