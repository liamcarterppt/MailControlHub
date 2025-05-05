import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyIcon, Share2 } from "lucide-react";
import { ReferralLinkProps } from "@/lib/types";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useToast } from "@/hooks/use-toast";

export function ReferralLink({ code }: ReferralLinkProps) {
  const [, copy] = useCopyToClipboard();
  const { toast } = useToast();
  
  const referralLink = `${window.location.origin}/register?ref=${code}`;
  
  const handleCopyLink = () => {
    copy(referralLink);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Mail-in-a-Box",
          text: "Check out this email service provider!",
          url: referralLink,
        });
        toast({
          title: "Shared!",
          description: "Thank you for sharing your referral link",
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Share2 className="mr-2 h-5 w-5 text-primary" />
          Your Referral Link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Share this link with friends and earn rewards when they sign up for Mail-in-a-Box.
        </p>
        
        <div className="flex mb-4">
          <Input 
            type="text" 
            value={referralLink} 
            readOnly 
            className="rounded-r-none"
          />
          <Button 
            onClick={handleCopyLink}
            className="rounded-l-none"
            variant="default"
          >
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy
          </Button>
        </div>
        
        {navigator.share && (
          <Button 
            onClick={handleShare}
            variant="outline"
            className="w-full"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Link
          </Button>
        )}
        
        <div className="mt-4 bg-primary/5 p-3 rounded text-sm">
          <p className="font-medium">How it works</p>
          <ul className="list-disc list-inside mt-2 text-muted-foreground">
            <li>Share your unique referral link with friends</li>
            <li>When they sign up using your link, you both get rewards</li>
            <li>You'll earn $10 credit for each successful referral</li>
            <li>Your friend gets 10% off their first month</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
