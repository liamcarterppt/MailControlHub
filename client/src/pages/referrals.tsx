import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { ReferralLink } from "@/components/referrals/referral-link";
import { DataTable } from "@/components/ui/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { Loader2, UserPlus, Users, DollarSign, BadgePercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Referrals() {
  // Fetch referrals
  const { data: referrals, isLoading: referralsLoading } = useQuery({
    queryKey: ["/api/referrals"],
  });

  // Fetch referral stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/referrals/stats"],
  });

  // Fetch user data to get referral code
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/me"],
  });

  const isLoading = referralsLoading || statsLoading || userLoading;

  const columns = [
    {
      accessorKey: "referredUser.email",
      header: "Referred User",
      cell: (row: any) => (
        <div className="font-medium">
          {row.referredUser?.email || "Pending"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row: any) => {
        let variant = "default";
        switch (row.status) {
          case "completed":
            variant = "success";
            break;
          case "pending":
            variant = "warning";
            break;
          case "expired":
            variant = "destructive";
            break;
        }

        return (
          <Badge variant={variant as any} className="capitalize">
            {row.status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "reward",
      header: "Reward",
      cell: (row: any) => row.reward ? formatCurrency(row.reward) : "Pending",
    },
    {
      accessorKey: "createdAt",
      header: "Referred On",
      cell: (row: any) => formatDate(row.createdAt),
    },
    {
      accessorKey: "completedAt",
      header: "Completed",
      cell: (row: any) => row.completedAt ? formatRelativeTime(row.completedAt) : "Pending",
    },
  ];

  return (
    <MainLayout pageTitle="Referral Program">
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.totalReferrals || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <UserPlus className="mr-2 h-5 w-5 text-secondary" />
                  Successful Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats?.completedReferrals || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-success" />
                  Total Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatCurrency(stats?.totalEarnings || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <ReferralLink code={user?.referralCode || ""} />
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BadgePercent className="mr-2 h-5 w-5 text-primary" />
                    Referral Rewards
                  </CardTitle>
                  <CardDescription>
                    How our referral program works
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-accent p-4 rounded-md">
                    <h3 className="font-medium mb-2">For You (Referrer)</h3>
                    <p className="text-sm text-muted-foreground">
                      You'll earn <span className="font-medium text-foreground">{formatCurrency(1000)}</span> for each successful referral. The reward is applied as a credit to your account once your referral completes their first payment.
                    </p>
                  </div>

                  <div className="bg-accent p-4 rounded-md">
                    <h3 className="font-medium mb-2">For Your Friend (Referee)</h3>
                    <p className="text-sm text-muted-foreground">
                      Your friends get <span className="font-medium text-foreground">10% off</span> their first month's subscription when they sign up using your referral link.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-medium">Terms & Conditions</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      <li>Referrals must sign up with your unique referral link</li>
                      <li>Referrals must be new customers who haven't had an account before</li>
                      <li>Rewards are only issued after the referred person makes their first payment</li>
                      <li>Maximum 50 successful referrals per account</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
              <CardDescription>
                Track the status of people you've referred
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={referrals || []}
                columns={columns}
                searchPlaceholder="Search referrals..."
                searchKey="referredUser.email"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
