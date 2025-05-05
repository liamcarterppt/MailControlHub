import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ServerConfigFormProps } from "@/lib/types";
import { Loader2 } from "lucide-react";

export function ServerConfigForm({ configs, onUpdate }: ServerConfigFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formValues, setFormValues] = React.useState<Record<number, string>>({});
  const [pendingUpdates, setPendingUpdates] = React.useState<Set<number>>(new Set());

  // Initialize form values from configs
  React.useEffect(() => {
    const initialValues: Record<number, string> = {};
    configs.forEach(config => {
      initialValues[config.id] = config.value || '';
    });
    setFormValues(initialValues);
  }, [configs]);

  // Handle input change
  const handleChange = (id: number, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [id]: value
    }));
  };

  // Handle form submission for a specific config
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, value }: { id: number; value: string }) => {
      setPendingUpdates(prev => new Set(prev.add(id)));
      return apiRequest("PATCH", `/api/server-config/${id}`, { value });
    },
    onSuccess: () => {
      toast({
        title: "Configuration updated",
        description: "Server configuration has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/server-config"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to update configuration:", error);
    },
    onSettled: (_, __, variables) => {
      setPendingUpdates(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.id);
        return newSet;
      });
    }
  });

  // Submit handler for a specific config
  const handleSubmit = (id: number) => {
    const value = formValues[id];
    if (value !== undefined) {
      updateConfigMutation.mutate({ id, value });
      onUpdate(id, value);
    }
  };

  // Group configs by category (using description as a heuristic)
  const groupedConfigs: Record<string, typeof configs> = {};
  configs.forEach(config => {
    const category = config.description?.split(' ')[0] || 'General';
    if (!groupedConfigs[category]) {
      groupedConfigs[category] = [];
    }
    groupedConfigs[category].push(config);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle>{category} Configuration</CardTitle>
            <CardDescription>
              Settings related to {category.toLowerCase()} services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryConfigs.map((config) => (
                <div key={config.id} className="grid gap-2">
                  <Label htmlFor={`config-${config.id}`}>
                    {config.description || config.name}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`config-${config.id}`}
                      value={formValues[config.id] || ''}
                      onChange={(e) => handleChange(config.id, e.target.value)}
                    />
                    <Button 
                      onClick={() => handleSubmit(config.id)}
                      disabled={pendingUpdates.has(config.id)}
                    >
                      {pendingUpdates.has(config.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                  {config.name === "smtp_port" && (
                    <p className="text-xs text-muted-foreground">
                      Standard SMTP port is 25, but you can use 587 for submission
                    </p>
                  )}
                  {config.name === "imap_port" && (
                    <p className="text-xs text-muted-foreground">
                      Standard IMAP port is 143, or 993 for IMAPS
                    </p>
                  )}
                  {config.name === "pop3_port" && (
                    <p className="text-xs text-muted-foreground">
                      Standard POP3 port is 110, or 995 for POP3S
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
