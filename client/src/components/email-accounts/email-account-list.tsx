import React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  CheckCircle, 
  XCircle,
  Database
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";
import { EmailAccountListProps } from "@/lib/types";
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

export function EmailAccountList({ 
  accounts, 
  onDelete, 
  onToggleStatus 
}: EmailAccountListProps) {
  const [selectedAccountId, setSelectedAccountId] = React.useState<number | null>(null);

  const columns = [
    {
      accessorKey: "username",
      header: "Username",
      cell: (row) => (
        <div className="font-medium">
          {row.username}@{row.domain.name}
        </div>
      ),
    },
    {
      accessorKey: "domain.name",
      header: "Domain",
    },
    {
      accessorKey: "storageUsed",
      header: "Storage Used",
      cell: (row) => formatBytes(row.storageUsed),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: (row) => (
        <Badge 
          variant={row.isActive ? "success" : "destructive"}
          className="px-2 py-1 flex items-center justify-center w-24"
        >
          {row.isActive ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Active</span>
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 mr-1" />
              <span>Inactive</span>
            </>
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: (row) => formatDate(row.createdAt),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Button
            variant={row.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => onToggleStatus(row.id, !row.isActive)}
          >
            {row.isActive ? "Deactivate" : "Activate"}
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedAccountId(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Email Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this email account?
                  This action cannot be undone and all emails will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (selectedAccountId) {
                      onDelete(selectedAccountId);
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div>
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border text-center">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Email Accounts</h3>
          <p className="text-muted-foreground mt-2 mb-6 max-w-md">
            You haven't created any email accounts yet. 
            Create your first email account to start sending and receiving emails.
          </p>
        </div>
      ) : (
        <DataTable
          data={accounts}
          columns={columns}
          searchPlaceholder="Search email accounts..."
          searchKey="username"
        />
      )}
    </div>
  );
}
