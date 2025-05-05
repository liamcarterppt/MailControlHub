import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils";
import { BadgePercent, AlertCircle, CheckCircle2 } from "lucide-react";
import { CommissionTiersData, CommissionTier } from "@/lib/types";

export function CommissionTiers() {
  // Fetch commission tiers data
  const { data, isLoading, error } = useQuery<CommissionTiersData>({
    queryKey: ["/api/referrals/commission-tiers"],
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading commission tiers. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || !data.tiers || !data.currentTier) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No commission tier data available.
        </AlertDescription>
      </Alert>
    );
  }

  // Get the next tier if available
  const currentTierIndex = data.tiers.findIndex((tier: CommissionTier) => tier.id === data.currentTier.id);
  const nextTier = currentTierIndex < data.tiers.length - 1 ? data.tiers[currentTierIndex + 1] : null;
  
  // Calculate progress to next tier
  let progressPercent = 100;
  let referralsToNextTier = 0;
  
  if (nextTier) {
    const range = nextTier.threshold - data.currentTier.threshold;
    const progress = data.completedReferrals - data.currentTier.threshold;
    progressPercent = Math.min(100, Math.max(0, (progress / range) * 100));
    referralsToNextTier = nextTier.threshold - data.completedReferrals;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <BadgePercent className="mr-2 h-5 w-5 text-primary" />
          Commission Tiers
        </CardTitle>
        <CardDescription>
          Earn higher commissions as you refer more users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current tier */}
        <div className="bg-accent/40 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-lg">
              Your Current Tier: <span className="text-primary">{data.currentTier.name}</span>
            </h3>
            <span className="bg-primary text-white text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {data.currentTier.commissionRate}% Commission
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            You've completed {data.completedReferrals} successful referrals
          </p>
          
          {nextTier ? (
            <>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{data.completedReferrals} referrals</span>
                <span>{nextTier.threshold} referrals</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {referralsToNextTier} more referrals until {nextTier.name} tier ({nextTier.commissionRate}% commission)
              </p>
            </>
          ) : (
            <div className="flex items-center">
              <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
              <p className="text-sm">You've reached the highest commission tier!</p>
            </div>
          )}
        </div>
        
        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {data.tiers.map((tier: CommissionTier) => (
            <Card 
              key={tier.id} 
              className={`border ${tier.id === data.currentTier.id ? 'border-primary' : 'border-border'}`}
            >
              <CardContent className="pt-4">
                <div className="text-center">
                  <h4 className="font-semibold">{tier.name}</h4>
                  <div className="my-2 text-2xl font-bold text-primary">
                    {tier.commissionRate}%
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {tier.threshold} referrals required
                  </p>
                  {tier.id === data.currentTier.id && (
                    <span className="inline-block bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                      Current Tier
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* How it works */}
        <div className="mt-6 bg-accent p-4 rounded-lg">
          <h3 className="font-medium mb-2">How Commission Works</h3>
          <p className="text-sm text-muted-foreground">
            Your commission rate is applied to all subscription revenue from users you refer.
            For example, if you refer someone who pays ${20} per month and your commission rate is {data.currentTier.commissionRate}%,
            you'll earn ${(20 * data.currentTier.commissionRate / 100).toFixed(2)} per month as long as they remain an active subscriber.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}