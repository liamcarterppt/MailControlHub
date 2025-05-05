import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { DomainList } from "@/components/domains/domain-list";
import { DomainForm } from "@/components/domains/domain-form";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Domains() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch domains
  const { data: domains, isLoading } = useQuery({
    queryKey: ["/api/domains"],
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: (domainId: number) => {
      return apiRequest("DELETE", `/api/domains/${domainId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Domain deleted",
        description: "The domain has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete domain. Make sure all email accounts are deleted first.",
        variant: "destructive",
      });
      console.error("Failed to delete domain:", error);
    },
  });

  // Verify domain mutation
  const verifyDomainMutation = useMutation({
    mutationFn: (domainId: number) => {
      return apiRequest("PATCH", `/api/domains/${domainId}/verify`, {});
    },
    onSuccess: () => {
      toast({
        title: "Domain verified",
        description: "The domain has been verified successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to verify domain. Please ensure DNS records are correctly set up.",
        variant: "destructive",
      });
      console.error("Failed to verify domain:", error);
    },
  });

  const handleDeleteDomain = (id: number) => {
    deleteDomainMutation.mutate(id);
  };

  const handleVerifyDomain = (id: number) => {
    verifyDomainMutation.mutate(id);
  };

  return (
    <MainLayout pageTitle="Domain Management">
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Manage and verify your email domains
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Globe className="mr-2 h-4 w-4" />
              Add Domain
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Domain</DialogTitle>
              <DialogDescription>
                Add a new domain for your mail server. You'll need to verify ownership by adding DNS records.
              </DialogDescription>
            </DialogHeader>
            <DomainForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Domains</CardTitle>
              <CardDescription>
                Domains available for creating email accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DomainList 
                domains={domains || []} 
                onDelete={handleDeleteDomain}
                onVerify={handleVerifyDomain}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Domain Verification Instructions</CardTitle>
              <CardDescription>
                Follow these steps to verify your domain ownership
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">1. Add MX Record</h3>
                  <p className="text-sm text-muted-foreground">
                    Add an MX record with the following values:
                  </p>
                  <div className="bg-accent p-3 rounded-md mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Name:</div>
                      <div className="text-sm">@</div>
                      <div className="text-sm font-medium">Type:</div>
                      <div className="text-sm">MX</div>
                      <div className="text-sm font-medium">Priority:</div>
                      <div className="text-sm">10</div>
                      <div className="text-sm font-medium">Value:</div>
                      <div className="text-sm">mail.yourdomain.com</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">2. Add SPF Record</h3>
                  <p className="text-sm text-muted-foreground">
                    Add a TXT record with the following values:
                  </p>
                  <div className="bg-accent p-3 rounded-md mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Name:</div>
                      <div className="text-sm">@</div>
                      <div className="text-sm font-medium">Type:</div>
                      <div className="text-sm">TXT</div>
                      <div className="text-sm font-medium">Value:</div>
                      <div className="text-sm">v=spf1 mx ~all</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">3. Add DKIM Record</h3>
                  <p className="text-sm text-muted-foreground">
                    Add a TXT record with the following values:
                  </p>
                  <div className="bg-accent p-3 rounded-md mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-sm font-medium">Name:</div>
                      <div className="text-sm">mail._domainkey</div>
                      <div className="text-sm font-medium">Type:</div>
                      <div className="text-sm">TXT</div>
                      <div className="text-sm font-medium">Value:</div>
                      <div className="text-sm break-all">v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCyBmLw8K/bxl9I5EA8YO5c5LmR8KYOxDGv9xjL0/VxdVEucwkFrFKJwdljxJFjcA3RwJf1DRuFjDRYDPt/HsGBtiJv6/xQyOHUAkiU2NCgjcx5WNTpeHSVeCvMjj1XKvogDscvFaQt2AVJcGGDr/vHPgdR3qDJSCV0HeOHMAmrLwIDAQAB</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium">4. Verify</h3>
                  <p className="text-sm text-muted-foreground">
                    After adding these records, click the Verify button next to your domain. DNS changes may take up to 24 hours to propagate.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
