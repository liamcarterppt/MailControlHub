import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Download, Filter, Search, RefreshCw, FileText } from "lucide-react";

interface CommissionPayout {
  id: number;
  amount: number;
  status: "pending" | "processing" | "paid" | "failed";
  paymentMethod: string;
  paymentReference?: string;
  createdAt: string;
  paidAt?: string;
  month: string;
}

interface CommissionPayoutsProps {
  payouts: CommissionPayout[];
  pendingAmount: number;
  minimumPayout: number;
  onRequestPayout?: () => void;
}

export function CommissionPayouts({ 
  payouts, 
  pendingAmount, 
  minimumPayout,
  onRequestPayout 
}: CommissionPayoutsProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    // In a real implementation, we would call an API here
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Data Refreshed",
        description: "Your commission data has been updated",
      });
    }, 1000);
  };

  const handleExportData = async () => {
    setIsExportingData(true);
    // In a real implementation, we would generate a CSV/PDF here
    setTimeout(() => {
      setIsExportingData(false);
      toast({
        title: "Export Complete",
        description: "Commission report has been downloaded",
      });
    }, 1000);
  };

  const handleRequestPayout = () => {
    setIsPayoutDialogOpen(false);
    if (onRequestPayout) {
      onRequestPayout();
    }
    toast({
      title: "Payout Requested",
      description: "Your commission payout request has been submitted",
    });
  };

  // Filter payouts based on search term
  const filteredPayouts = payouts.filter(payout => 
    payout.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payout.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payout.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (payout.paymentReference && payout.paymentReference.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-lg shadow">
        <CardHeader className="px-5 py-4 border-b border-border">
          <CardTitle className="font-semibold text-foreground">Commission Payouts</CardTitle>
          <CardDescription>Track and manage your commission payments</CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Pending Commission</span>
                  <span className="text-2xl font-bold">{formatCurrency(pendingAmount)}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Minimum payout: {formatCurrency(minimumPayout)}
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
                      {pendingAmount >= minimumPayout 
                        ? "You're eligible for a payout" 
                        : `Need ${formatCurrency(minimumPayout - pendingAmount)} more to reach minimum`}
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsPayoutDialogOpen(true)}
                    disabled={pendingAmount < minimumPayout}
                    className="ml-4"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Request Payout
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payouts..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefreshData} disabled={isRefreshing}>
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportData} disabled={isExportingData}>
                {isExportingData ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export
              </Button>
            </div>
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayouts.length > 0 ? (
                  filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">{payout.month}</TableCell>
                      <TableCell>{formatCurrency(payout.amount)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            payout.status === "paid" ? "default" : 
                            payout.status === "pending" ? "outline" :
                            payout.status === "processing" ? "secondary" :
                            "destructive"
                          }
                        >
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>{payout.paymentMethod}</TableCell>
                      <TableCell>{payout.paymentReference || "-"}</TableCell>
                      <TableCell>{payout.paidAt ? formatDate(payout.paidAt) : formatDate(payout.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View Details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      {searchTerm ? "No matching payouts found" : "No payouts yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="p-5 border-t border-border text-sm text-muted-foreground">
          Payouts are processed within 3-5 business days of approval.
        </CardFooter>
      </Card>

      {/* Payout Request Dialog */}
      <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Commission Payout</DialogTitle>
            <DialogDescription>
              Submit a request to withdraw your earned commissions
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm">Available for payout:</span>
              <span className="font-semibold">{formatCurrency(pendingAmount)}</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="payment-method" className="text-sm font-medium">
                  Payment Method
                </label>
                <select 
                  id="payment-method" 
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="stripe">Stripe</option>
                  <option value="credit">Account Credit</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="payment-info" className="text-sm font-medium">
                  Payment Details
                </label>
                <Input
                  id="payment-info"
                  placeholder="Account details or email"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  For bank transfers, include your bank name, account number, and routing info
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestPayout}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}