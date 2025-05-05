import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  MailCheck, 
  MailWarning, 
  MailX, 
  RefreshCw,
  Send,
  AlertCircle
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MailQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch mail queue
  const { data: mailQueue, isLoading, refetch } = useQuery({
    queryKey: ["/api/mail-queue"],
  });

  // Stats query
  const { data: dashboardData } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  // Retry sending mail mutation
  const retrySendMutation = useMutation({
    mutationFn: (mailId: number) => {
      return apiRequest("POST", `/api/mail-queue/${mailId}/retry`, {});
    },
    onSuccess: () => {
      toast({
        title: "Mail queued",
        description: "The mail has been queued for retry",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mail-queue"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to retry sending mail",
        variant: "destructive",
      });
      console.error("Failed to retry sending mail:", error);
    },
  });

  // Delete mail from queue mutation
  const deleteMailMutation = useMutation({
    mutationFn: (mailId: number) => {
      return apiRequest("DELETE", `/api/mail-queue/${mailId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Mail deleted",
        description: "The mail has been removed from the queue",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mail-queue"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete mail from queue",
        variant: "destructive",
      });
      console.error("Failed to delete mail from queue:", error);
    },
  });

  const handleRefresh = () => {
    refetch();
  };

  const handleRetry = (id: number) => {
    retrySendMutation.mutate(id);
  };

  const handleDelete = (id: number) => {
    deleteMailMutation.mutate(id);
  };

  const columns = [
    {
      accessorKey: "sender",
      header: "From",
      cell: (row: any) => <span className="font-medium">{row.sender}</span>,
    },
    {
      accessorKey: "recipient",
      header: "To",
      cell: (row: any) => row.recipient,
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: (row: any) => row.subject || "(No subject)",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row: any) => {
        let icon;
        let badgeVariant;
        
        switch (row.status) {
          case "pending":
            icon = <MailWarning className="h-3 w-3 mr-1" />;
            badgeVariant = "warning";
            break;
          case "sent":
            icon = <MailCheck className="h-3 w-3 mr-1" />;
            badgeVariant = "success";
            break;
          case "failed":
            icon = <MailX className="h-3 w-3 mr-1" />;
            badgeVariant = "destructive";
            break;
          default:
            icon = <AlertCircle className="h-3 w-3 mr-1" />;
            badgeVariant = "secondary";
        }
        
        return (
          <Badge 
            variant={badgeVariant as any}
            className="px-2 py-1 flex items-center justify-center w-24"
          >
            {icon}
            <span className="capitalize">{row.status}</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Time",
      cell: (row: any) => formatRelativeTime(row.createdAt),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: (row: any) => (
        <div className="flex items-center space-x-2">
          {row.status === "failed" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRetry(row.id)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const getQueueStats = () => {
    if (!dashboardData?.mailQueueStats) {
      return {
        pending: 0,
        sent: 0,
        failed: 0,
      };
    }
    return dashboardData.mailQueueStats;
  };

  const stats = getQueueStats();

  return (
    <MainLayout pageTitle="Mail Queue">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Monitor and manage your outgoing mail queue
        </p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Queue
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-warning">
              <MailWarning className="mr-2 h-5 w-5" />
              Pending
            </CardTitle>
            <CardDescription>Emails waiting to be sent</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-success">
              <MailCheck className="mr-2 h-5 w-5" />
              Sent
            </CardTitle>
            <CardDescription>Successfully delivered emails</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.sent}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-destructive">
              <MailX className="mr-2 h-5 w-5" />
              Failed
            </CardTitle>
            <CardDescription>Delivery failed emails</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="mr-2 h-5 w-5" />
              Mail Queue
            </CardTitle>
            <CardDescription>
              List of all outgoing mail in the queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={mailQueue || []}
              columns={columns}
              searchPlaceholder="Search mail queue..."
              searchKey="recipient"
            />
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
