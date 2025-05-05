import React from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Globe
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { DomainListProps } from "@/lib/types";
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

export function DomainList({ 
  domains, 
  onDelete, 
  onVerify 
}: DomainListProps) {
  const [selectedDomainId, setSelectedDomainId] = React.useState<number | null>(null);

  const columns = [
    {
      accessorKey: "name",
      header: "Domain Name",
      cell: (row) => (
        <div className="font-medium">{row.name}</div>
      ),
    },
    {
      accessorKey: "isVerified",
      header: "Verification Status",
      cell: (row) => (
        <Badge 
          variant={row.isVerified ? "success" : "warning"}
          className="px-2 py-1 flex items-center justify-center w-24"
        >
          {row.isVerified ? (
            <>
              <CheckCircle className="h-3 w-3 mr-1" />
              <span>Verified</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3 mr-1" />
              <span>Unverified</span>
            </>
          )}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Added On",
      cell: (row) => formatDate(row.createdAt),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      cell: (row) => (
        <div className="flex items-center space-x-2">
          {!row.isVerified && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onVerify(row.id)}
            >
              Verify
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDomainId(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this domain?
                  This action cannot be undone and all email accounts associated with this domain will need to be deleted first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (selectedDomainId) {
                      onDelete(selectedDomainId);
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
      {domains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white rounded-lg border text-center">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Domains Added</h3>
          <p className="text-muted-foreground mt-2 mb-6 max-w-md">
            You haven't added any domains yet. 
            Add a domain to start creating email accounts.
          </p>
        </div>
      ) : (
        <DataTable
          data={domains}
          columns={columns}
          searchPlaceholder="Search domains..."
          searchKey="name"
        />
      )}
    </div>
  );
}
