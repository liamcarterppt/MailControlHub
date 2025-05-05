import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CopyIcon, EyeIcon, EyeOffIcon, LinkIcon, RotateCwIcon, CheckIcon } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface ClientPortalGeneratorProps {
  companyName: string;
  customDomain?: string;
  resellerToken: string;
}

export function ClientPortalGenerator({ 
  companyName, 
  customDomain, 
  resellerToken 
}: ClientPortalGeneratorProps) {
  const { toast } = useToast();
  const [, copy] = useCopyToClipboard();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [isTokenCopied, setIsTokenCopied] = useState(false);
  const [isGeneratingNewToken, setIsGeneratingNewToken] = useState(false);

  // Get client portal URL (either custom domain or current origin)
  const baseUrl = customDomain ? `https://${customDomain}` : window.location.origin;
  const clientPortalUrl = `${baseUrl}/client-portal?token=${resellerToken}`;

  const handleCopyLink = () => {
    copy(clientPortalUrl);
    setIsLinkCopied(true);
    toast({
      title: "Client Portal URL Copied",
      description: "The URL has been copied to your clipboard",
    });
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const handleCopyToken = () => {
    copy(resellerToken);
    setIsTokenCopied(true);
    toast({
      title: "Reseller Token Copied",
      description: "The token has been copied to your clipboard",
    });
    setTimeout(() => setIsTokenCopied(false), 2000);
  };

  const handleGenerateNewToken = async () => {
    setIsGeneratingNewToken(true);
    try {
      // This would be replaced with an actual API call
      // const response = await apiRequest("POST", "/api/reseller/regenerate-token");
      // const data = await response.json();
      
      toast({
        title: "New Token Generated",
        description: "Your client portal token has been updated",
      });
    } catch (error) {
      toast({
        title: "Failed to Generate New Token",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingNewToken(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Portal Access</CardTitle>
        <CardDescription>
          Share this secure URL with your customers to access your branded client portal
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="portal-url">Client Portal URL</Label>
          <div className="flex">
            <Input
              id="portal-url"
              value={clientPortalUrl}
              readOnly
              className="flex-1 rounded-r-none font-mono text-sm"
            />
            <Button
              onClick={handleCopyLink}
              variant="secondary"
              className="rounded-l-none"
              disabled={isLinkCopied}
            >
              {isLinkCopied ? (
                <CheckIcon className="h-4 w-4 mr-2" />
              ) : (
                <CopyIcon className="h-4 w-4 mr-2" />
              )}
              {isLinkCopied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            This URL allows your clients to access your white-labeled portal with your branding.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reseller-token">Reseller Token</Label>
          <div className="flex">
            <Input
              id="reseller-token"
              type={isPasswordVisible ? "text" : "password"}
              value={resellerToken}
              readOnly
              className="flex-1 rounded-r-none font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              className="px-3 rounded-none border-l-0"
            >
              {isPasswordVisible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </Button>
            <Button
              onClick={handleCopyToken}
              variant="secondary"
              className="rounded-l-none"
              disabled={isTokenCopied}
            >
              {isTokenCopied ? (
                <CheckIcon className="h-4 w-4 mr-2" />
              ) : (
                <CopyIcon className="h-4 w-4 mr-2" />
              )}
              {isTokenCopied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            This token authenticates your client portal. Keep it secure.
          </p>
        </div>

        <div className="flex justify-between items-center pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleGenerateNewToken}
            disabled={isGeneratingNewToken}
          >
            {isGeneratingNewToken ? (
              <RotateCwIcon className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCwIcon className="h-4 w-4 mr-2" />
            )}
            Generate New Token
          </Button>
          
          <Button size="sm">
            <LinkIcon className="h-4 w-4 mr-2" />
            Open Client Portal
          </Button>
        </div>

        {customDomain ? (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-400 flex items-center">
              <CheckIcon className="h-4 w-4 mr-2" />
              Custom domain active: <span className="font-semibold ml-1">{customDomain}</span>
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              You can set up a custom domain in your reseller settings for a fully white-labeled experience.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}