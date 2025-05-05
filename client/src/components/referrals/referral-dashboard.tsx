import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";
import { CommissionTiers } from "./commission-tiers";
import { Referral, ReferralStats, UserWithReferralCode } from "@/lib/types";
import {
  UsersRound,
  UserPlus,
  DollarSign,
  Copy,
  AlertCircle,
  RefreshCcw,
  BarChart3,
  Calendar
} from "lucide-react";

export function ReferralDashboard() {
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  
  // Fetch referrals
  const { data: referrals, isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["/api/referrals"],
  });

  // Fetch referral stats
  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
  });

  // Fetch user data to get referral code
  const { data: user, isLoading: userLoading } = useQuery<UserWithReferralCode>({
    queryKey: ["/api/user"],
  });

  const isLoading = referralsLoading || statsLoading || userLoading;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !stats || !referrals) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading referral data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const referralLink = `${window.location.origin}/register?ref=${user.referralCode}`;
  
  const handleCopyLink = () => {
    copy(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const columns = [
    {
      id: "referredUser",
      header: "Referred User",
      cell: ({ row }: { row: { original: Referral } }) => (
        <div className="font-medium">
          {row.original.referredUser?.email || "Pending"}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }: { row: { original: Referral } }) => {
        const status = row.original.status;
        let badgeClass = "";
        
        switch (status) {
          case "completed":
            badgeClass = "bg-green-100 text-green-800";
            break;
          case "pending":
            badgeClass = "bg-yellow-100 text-yellow-800";
            break;
          case "expired":
            badgeClass = "bg-red-100 text-red-800";
            break;
          default:
            badgeClass = "";
        }

        return (
          <Badge variant="outline" className={`capitalize ${badgeClass}`}>
            {status}
          </Badge>
        );
      },
    },
    {
      id: "reward",
      header: "Reward",
      cell: ({ row }: { row: { original: Referral } }) => 
        row.original.reward ? formatCurrency(row.original.reward) : "Pending",
    },
    {
      id: "createdAt",
      header: "Referred On",
      cell: ({ row }: { row: { original: Referral } }) => 
        formatDate(row.original.createdAt),
    },
    {
      id: "completedAt",
      header: "Completed",
      cell: ({ row }: { row: { original: Referral } }) => 
        row.original.completedAt ? formatRelativeTime(row.original.completedAt) : "Pending",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UsersRound className="mr-2 h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserPlus className="mr-2 h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{stats.completedReferrals}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends to earn rewards when they sign up
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input value={referralLink} readOnly className="bg-accent/50" />
            <Button variant="outline" size="icon" onClick={handleCopyLink}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <CommissionTiers />

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
          <TabsTrigger value="all" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>All</span>
            <Badge variant="outline" className="ml-2">{referrals.length || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center">
            <Calendar className="mr-2 h-4 w-4" />
            <span>Pending</span>
            <Badge variant="outline" className="ml-2">
              {referrals.filter((r: Referral) => r.status === 'pending').length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center">
            <RefreshCcw className="mr-2 h-4 w-4" />
            <span>Completed</span>
            <Badge variant="outline" className="ml-2">
              {referrals.filter((r: Referral) => r.status === 'completed').length || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="border rounded-md mt-2">
          <DataTable
            data={referrals}
            columns={columns}
            searchPlaceholder="Search referrals..."
            searchKey="status"
          />
        </TabsContent>

        <TabsContent value="pending" className="border rounded-md mt-2">
          <DataTable
            data={referrals.filter((r: Referral) => r.status === 'pending')}
            columns={columns}
            searchPlaceholder="Search pending referrals..."
            searchKey="status"
          />
        </TabsContent>

        <TabsContent value="completed" className="border rounded-md mt-2">
          <DataTable
            data={referrals.filter((r: Referral) => r.status === 'completed')}
            columns={columns}
            searchPlaceholder="Search completed referrals..."
            searchKey="status"
          />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>How it Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-accent p-4 rounded-md">
              <div className="flex items-center mb-2">
                <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center text-white font-medium">1</div>
                <h3 className="ml-2 font-medium">Share Your Link</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Copy your unique referral link and share it with friends, colleagues, or on social media.
              </p>
            </div>

            <div className="bg-accent p-4 rounded-md">
              <div className="flex items-center mb-2">
                <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center text-white font-medium">2</div>
                <h3 className="ml-2 font-medium">They Sign Up</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                When someone uses your link to sign up, they get 10% off their first month's subscription.
              </p>
            </div>

            <div className="bg-accent p-4 rounded-md">
              <div className="flex items-center mb-2">
                <div className="rounded-full bg-primary w-8 h-8 flex items-center justify-center text-white font-medium">3</div>
                <h3 className="ml-2 font-medium">You Earn Rewards</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Once they make their first payment, you'll receive your commission reward. The more you refer, the higher your commission rate!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}