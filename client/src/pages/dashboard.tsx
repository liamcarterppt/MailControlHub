import React from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatusCard } from "@/components/dashboard/status-card";
import { SystemStatus } from "@/components/dashboard/system-status";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SubscriptionStatus } from "@/components/dashboard/subscription-status";
import { ReferralStats } from "@/components/dashboard/referral-stats";
import { StorageUsage } from "@/components/dashboard/storage-usage";
import { MailQueue } from "@/components/dashboard/mail-queue";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { 
  RefreshCw, 
  Users, 
  Globe, 
  List, 
  Database 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  const handleRefresh = () => {
    refetch();
  };

  // Determine if all services are running
  const allServicesRunning = dashboardData?.serviceStatuses?.every(
    (service: any) => service.status === "running"
  );

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <div className="flex space-x-2">
          {allServicesRunning && (
            <span className="px-3 py-1 bg-success/10 text-success rounded-full text-xs flex items-center">
              <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
              All Services Running
            </span>
          )}
          <Button 
            onClick={handleRefresh} 
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Status
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          Error loading dashboard data. Please try refreshing.
        </div>
      ) : (
        <>
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatusCard
              title="Mail Accounts"
              value={dashboardData.emailAccounts}
              icon={<Users />}
              iconBgColor="bg-primary/10"
              iconColor="text-primary"
              info={`${dashboardData.stats.totalEmailAccounts} accounts total`}
              infoStatus="success"
            />

            <StatusCard
              title="Active Domains"
              value={dashboardData.domains.verified}
              icon={<Globe />}
              iconBgColor="bg-secondary/10"
              iconColor="text-secondary"
              info={`${dashboardData.domains.total} domains total`}
              infoStatus="neutral"
            />

            <StatusCard
              title="Mail Queue"
              value={dashboardData.mailQueueStats.pending}
              icon={<List />}
              iconBgColor="bg-warning/10"
              iconColor="text-warning"
              info={`${dashboardData.mailQueueStats.pending} pending deliveries`}
              infoStatus={dashboardData.mailQueueStats.pending > 0 ? "warning" : "success"}
            />

            <StatusCard
              title="Storage Used"
              value={formatBytes(dashboardData.storageUsage.used)}
              icon={<Database />}
              iconBgColor="bg-primary/10"
              iconColor="text-primary"
              progressPercentage={Math.round((dashboardData.storageUsage.used / dashboardData.storageUsage.total) * 100)}
              progressTotal={formatBytes(dashboardData.storageUsage.total)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Status and Activity */}
            <div className="lg:col-span-2">
              <SystemStatus services={dashboardData.serviceStatuses} />
              <div className="mt-6">
                <RecentActivity activities={dashboardData.recentActivity} />
              </div>
            </div>

            {/* Right column - Subscription and Referrals */}
            <div className="flex flex-col gap-6">
              {dashboardData.subscriptionPlan && (
                <SubscriptionStatus
                  plan={{
                    name: dashboardData.subscriptionPlan.name,
                    pricePerMonth: dashboardData.subscriptionPlan.pricePerMonth,
                    renewDate: dashboardData.subscriptionPlan.currentPeriodEnd,
                    features: dashboardData.subscriptionPlan.features,
                  }}
                />
              )}

              <StorageUsage
                used={dashboardData.storageUsage.used}
                total={dashboardData.storageUsage.total}
              />

              <ReferralStats
                stats={{
                  totalEarnings: dashboardData.referralStats.totalEarnings,
                  successfulReferrals: dashboardData.referralStats.completedReferrals,
                  pendingReferrals: dashboardData.referralStats.pendingReferrals,
                }}
                referralCode={(dashboardData.user && dashboardData.user.referralCode) || ""}
              />

              <MailQueue stats={dashboardData.mailQueueStats} />
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
