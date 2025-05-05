import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SecuritySettingsFormProps } from "@/lib/types";
import { Slider } from "@/components/ui/slider";
import { Loader2, Shield, LockIcon, MailWarning } from "lucide-react";

export function SecuritySettingsForm({ settings, onUpdate }: SecuritySettingsFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = React.useState<Record<number, string>>({});
  const [pendingUpdates, setPendingUpdates] = React.useState<Set<number>>(new Set());

  // Initialize form values from settings
  React.useEffect(() => {
    const initialValues: Record<number, string> = {};
    settings.forEach(setting => {
      initialValues[setting.id] = setting.value || '';
    });
    setFormValues(initialValues);
  }, [settings]);

  // Handle input change
  const handleChange = (id: number, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle switch change
  const handleSwitchChange = (id: number, checked: boolean) => {
    setFormValues(prev => ({
      ...prev,
      [id]: checked ? 'enabled' : 'disabled'
    }));
  };

  // Handle slider change
  const handleSliderChange = (id: number, value: number[]) => {
    setFormValues(prev => ({
      ...prev,
      [id]: value[0].toString()
    }));
  };

  // Handle form submission for a specific setting
  const updateSettingMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: string }) => {
      setPendingUpdates(prev => new Set(prev.add(id)));
      return apiRequest("PATCH", `/api/server-config/${id}`, { value });
    },
    onSuccess: () => {
      toast({
        title: "Security setting updated",
        description: "Your security setting has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/server-config"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update security setting. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to update security setting:", error);
    },
    onSettled: (_, __, variables) => {
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.id);
        return newSet;
      });
    }
  });

  // Submit handler for a specific setting
  const handleSubmit = (id: number) => {
    const value = formValues[id];
    if (value !== undefined) {
      updateSettingMutation.mutate({ id, value });
      onUpdate(id, value);
    }
  };

  // Find spam threshold setting
  const spamThresholdSetting = settings.find(s => s.name === "spam_threshold");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5 text-primary" />
            Spam Protection
          </CardTitle>
          <CardDescription>
            Configure how spam emails are handled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {spamThresholdSetting && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="spam-threshold">Spam Threshold</Label>
                  <span className="text-sm font-medium">
                    {formValues[spamThresholdSetting.id] || spamThresholdSetting.value}
                  </span>
                </div>
                <Slider
                  id="spam-threshold"
                  min={1}
                  max={10}
                  step={1}
                  value={[parseInt(formValues[spamThresholdSetting.id] || spamThresholdSetting.value || "5")]}
                  onValueChange={(value) => handleSliderChange(spamThresholdSetting.id, value)}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Less strict</span>
                  <span>More strict</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Emails with a spam score higher than this threshold will be marked as spam
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSubmit(spamThresholdSetting.id)}
                  disabled={pendingUpdates.has(spamThresholdSetting.id)}
                >
                  {pendingUpdates.has(spamThresholdSetting.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Save Spam Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LockIcon className="mr-2 h-5 w-5 text-primary" />
            Encryption Settings
          </CardTitle>
          <CardDescription>
            Configure encryption for incoming and outgoing mail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require TLS for Incoming Connections</Label>
                <p className="text-xs text-muted-foreground">
                  All incoming mail connections must use TLS encryption
                </p>
              </div>
              <Switch 
                checked={formValues[1] === 'enabled'} 
                onCheckedChange={(checked) => {
                  handleSwitchChange(1, checked);
                  handleSubmit(1);
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable DKIM Signing</Label>
                <p className="text-xs text-muted-foreground">
                  Sign outgoing emails with DKIM to improve deliverability
                </p>
              </div>
              <Switch 
                checked={formValues[2] === 'enabled'} 
                onCheckedChange={(checked) => {
                  handleSwitchChange(2, checked);
                  handleSubmit(2);
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable SPF Checking</Label>
                <p className="text-xs text-muted-foreground">
                  Verify SPF records for incoming emails
                </p>
              </div>
              <Switch 
                checked={formValues[3] === 'enabled'} 
                onCheckedChange={(checked) => {
                  handleSwitchChange(3, checked);
                  handleSubmit(3);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MailWarning className="mr-2 h-5 w-5 text-primary" />
            Anti-Phishing Protection
          </CardTitle>
          <CardDescription>
            Configure protections against phishing attacks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Link Protection</Label>
                <p className="text-xs text-muted-foreground">
                  Scan incoming emails for suspicious links
                </p>
              </div>
              <Switch 
                checked={formValues[4] === 'enabled'} 
                onCheckedChange={(checked) => {
                  handleSwitchChange(4, checked);
                  handleSubmit(4);
                }}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Block External Images</Label>
                <p className="text-xs text-muted-foreground">
                  Block loading of external images in emails by default
                </p>
              </div>
              <Switch 
                checked={formValues[5] === 'enabled'} 
                onCheckedChange={(checked) => {
                  handleSwitchChange(5, checked);
                  handleSubmit(5);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
