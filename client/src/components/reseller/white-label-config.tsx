import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, Upload, Eye } from "lucide-react";

interface WhiteLabelConfig {
  companyName: string;
  supportEmail: string;
  customDomain?: string;
  logoUrl?: string;
  favicon?: string;
  primaryColor: string;
  accentColor: string;
  fontFamily?: string;
  isWhiteLabelEnabled: boolean;
  customCss?: string;
  welcomeMessage?: string;
}

interface WhiteLabelConfigProps {
  config: WhiteLabelConfig;
  onSave: (config: WhiteLabelConfig) => Promise<void>;
}

export function WhiteLabelConfig({ config, onSave }: WhiteLabelConfigProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("branding");
  const [formState, setFormState] = useState<WhiteLabelConfig>(config);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: value,
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormState({
      ...formState,
      isWhiteLabelEnabled: checked,
    });
  };

  const handleUploadLogo = async () => {
    setIsUploading(true);
    // In a real implementation, we would upload the file to a server
    setTimeout(() => {
      setIsUploading(false);
      setFormState({
        ...formState,
        logoUrl: "https://example.com/uploaded-logo.png", // This would be the URL returned by the server
      });
      toast({
        title: "Logo Uploaded",
        description: "Your company logo has been updated",
      });
    }, 1500);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      await onSave(formState);
      toast({
        title: "White-Label Settings Saved",
        description: "Your branding changes have been applied",
      });
    } catch (error) {
      toast({
        title: "Failed to Save Settings",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePreview = () => {
    setPreviewMode(!previewMode);
  };

  return (
    <Card className="bg-white rounded-lg shadow">
      <CardHeader className="px-5 py-4 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-semibold text-foreground">White-Labeling Configuration</CardTitle>
            <CardDescription>Customize the appearance for your customers</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formState.isWhiteLabelEnabled}
              onCheckedChange={handleSwitchChange}
              id="white-label-toggle"
            />
            <Label htmlFor="white-label-toggle">
              {formState.isWhiteLabelEnabled ? "Enabled" : "Disabled"}
            </Label>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="styling">Styling</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formState.companyName}
                    onChange={handleInputChange}
                    placeholder="Your Company Name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    name="supportEmail"
                    type="email"
                    value={formState.supportEmail}
                    onChange={handleInputChange}
                    placeholder="support@yourcompany.com"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Logo</Label>
                  <div className="border rounded-md p-4 flex flex-col items-center justify-center bg-gray-50">
                    {formState.logoUrl ? (
                      <div className="w-full flex flex-col items-center">
                        <img 
                          src={formState.logoUrl} 
                          alt="Company logo" 
                          className="max-h-24 mb-4 object-contain"
                        />
                        <Button variant="outline" size="sm" onClick={handleUploadLogo} disabled={isUploading}>
                          {isUploading ? "Uploading..." : "Replace Logo"}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="bg-gray-200 rounded-md w-36 h-24 mx-auto mb-4 flex items-center justify-center">
                          <p className="text-gray-500 text-sm">No logo uploaded</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleUploadLogo} disabled={isUploading}>
                          {isUploading ? (
                            <>
                              <span className="mr-2">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Logo
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      Recommended size: 200x60px, PNG or SVG with transparent background
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Domain Tab */}
          <TabsContent value="domain" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customDomain">Custom Domain</Label>
              <Input
                id="customDomain"
                name="customDomain"
                value={formState.customDomain || ""}
                onChange={handleInputChange}
                placeholder="portal.yourcompany.com"
              />
              <p className="text-sm text-muted-foreground">
                Your clients will access the portal through this domain instead of our default URL.
              </p>
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mt-4">
              <h4 className="text-sm font-medium text-amber-900 mb-2">DNS Configuration Required</h4>
              <p className="text-sm text-amber-800">
                To use a custom domain, you'll need to add a CNAME record in your DNS settings:
              </p>
              <pre className="mt-2 p-2 bg-white rounded border border-amber-200 text-xs overflow-x-auto">
                <code>CNAME portal.yourcompany.com → client-portal.mailabox.com</code>
              </pre>
              <p className="text-xs text-amber-700 mt-2">
                DNS changes may take up to 48 hours to propagate. We'll verify your domain automatically once it's properly configured.
              </p>
            </div>
          </TabsContent>

          {/* Styling Tab */}
          <TabsContent value="styling" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex space-x-2">
                  <div 
                    className="w-10 h-10 rounded-md border"
                    style={{ backgroundColor: formState.primaryColor }}
                  />
                  <Input
                    id="primaryColor"
                    name="primaryColor"
                    value={formState.primaryColor}
                    onChange={handleInputChange}
                    placeholder="#4F46E5"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accentColor">Accent Color</Label>
                <div className="flex space-x-2">
                  <div 
                    className="w-10 h-10 rounded-md border"
                    style={{ backgroundColor: formState.accentColor }}
                  />
                  <Input
                    id="accentColor"
                    name="accentColor"
                    value={formState.accentColor}
                    onChange={handleInputChange}
                    placeholder="#10B981"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fontFamily">Font Family</Label>
              <select
                id="fontFamily"
                name="fontFamily"
                className="w-full border-input bg-transparent rounded-md border px-3 py-2"
                value={formState.fontFamily || ""}
                onChange={(e) => setFormState({...formState, fontFamily: e.target.value})}
              >
                <option value="">Default System Font</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Poppins">Poppins</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Lato">Lato</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customCss">Custom CSS</Label>
              <textarea
                id="customCss"
                name="customCss"
                className="w-full min-h-[120px] border-input bg-transparent rounded-md border px-3 py-2 font-mono text-sm"
                value={formState.customCss || ""}
                onChange={handleInputChange}
                placeholder="/* Add your custom CSS here */"
              />
              <p className="text-xs text-muted-foreground">
                Advanced: Add custom CSS to further customize the appearance of your portal.
              </p>
            </div>
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="welcomeMessage">Welcome Message</Label>
              <textarea
                id="welcomeMessage"
                name="welcomeMessage"
                className="w-full min-h-[100px] border-input bg-transparent rounded-md border px-3 py-2"
                value={formState.welcomeMessage || ""}
                onChange={handleInputChange}
                placeholder="Welcome to your email management portal..."
              />
              <p className="text-xs text-muted-foreground">
                This message will be displayed on the login page of your client portal.
              </p>
            </div>
            
            <div className="mt-6 p-4 border rounded-md bg-gray-50">
              <h4 className="text-sm font-medium mb-2">Preview</h4>
              <p className="text-sm text-muted-foreground mb-4">
                See how your white-labeled portal will appear to your clients.
              </p>
              <Button variant="outline" size="sm" onClick={handleTogglePreview}>
                <Eye className="h-4 w-4 mr-2" />
                Preview Client Portal
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Preview Mode */}
        {previewMode && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Client Portal Preview</h3>
                <Button variant="ghost" size="sm" onClick={handleTogglePreview}>
                  Close
                </Button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="border rounded-md h-full bg-gray-50 flex items-center justify-center">
                  <div className="text-center p-6 max-w-md">
                    {formState.logoUrl && (
                      <img 
                        src={formState.logoUrl} 
                        alt="Company logo" 
                        className="max-h-12 mx-auto mb-6"
                      />
                    )}
                    <h2 className="text-2xl font-bold mb-2" style={{ color: formState.primaryColor }}>
                      {formState.companyName || "Your Company"}
                    </h2>
                    <p className="text-gray-600 mb-6">
                      {formState.welcomeMessage || "Welcome to your email management portal."}
                    </p>
                    <div 
                      className="px-4 py-2 rounded-md text-white font-medium inline-block"
                      style={{ backgroundColor: formState.primaryColor }}
                    >
                      Sign In
                    </div>
                    <p className="mt-8 text-sm text-gray-500">
                      Need help? Contact us at <span className="text-blue-600">{formState.supportEmail}</span>
                    </p>
                    {formState.customDomain && (
                      <div className="mt-6 text-xs text-gray-400">
                        {formState.customDomain}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="px-5 py-4 border-t border-border flex justify-between">
        <p className="text-sm text-muted-foreground">
          {formState.isWhiteLabelEnabled 
            ? "White-labeling is enabled. Your clients will see your branding." 
            : "White-labeling is disabled. Enable to use your own branding."}
        </p>
        <Button onClick={handleSaveChanges} disabled={isSaving}>
          {isSaving ? (
            <>Saving...</>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}