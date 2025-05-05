import React from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { CopyIcon } from "lucide-react";
import { ReferralStatsProps } from "@/lib/types";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";

export function ReferralStats({ stats, referralCode }: ReferralStatsProps) {
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
  
  const handleCopyLink = () => {
    copy(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-5 py-4 border-b border-border">
        <CardTitle className="font-semibold text-foreground">Referral Program</CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Total Earnings</span>
          <span className="text-lg font-semibold text-foreground">
            {formatCurrency(stats.totalEarnings)}
          </span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Successful Referrals</span>
          <span className="text-lg font-semibold text-foreground">{stats.successfulReferrals}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-muted-foreground">Pending Referrals</span>
          <span className="text-lg font-semibold text-foreground">{stats.pendingReferrals}</span>
        </div>
        
        <div className="mt-6 bg-accent p-3 rounded">
          <p className="text-sm text-foreground mb-2">Your Referral Link:</p>
          <div className="flex">
            <Input 
              type="text" 
              value={referralLink} 
              readOnly 
              className="text-xs bg-white border border-border rounded-l flex-1"
            />
            <Button 
              onClick={handleCopyLink}
              className="bg-primary text-white rounded-l-none rounded-r"
              size="sm"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <Link href="/referrals" className="text-sm text-primary hover:underline block text-center">
            View Referral Dashboard
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
