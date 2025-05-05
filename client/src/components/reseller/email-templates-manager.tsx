import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  PlusCircle, 
  Pencil, 
  Trash, 
  Eye, 
  Copy, 
  Search, 
  Mail, 
  Check, 
  ArrowUpDown,
  FileText
} from "lucide-react";

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  category: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailTemplatesManagerProps {
  templates: EmailTemplate[];
  onCreateTemplate: (template: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdateTemplate: (id: number, template: Partial<EmailTemplate>) => Promise<void>;
  onDeleteTemplate: (id: number) => Promise<void>;
  onDuplicateTemplate: (id: number) => Promise<void>;
}

export function EmailTemplatesManager({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onDuplicateTemplate
}: EmailTemplatesManagerProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">>({
    name: "",
    subject: "",
    body: "",
    category: "general",
    isShared: false
  });

  // Handle sorting
  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filter templates based on search term and active tab
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "shared") return matchesSearch && template.isShared;
    if (activeTab === activeTab) return matchesSearch && template.category === activeTab;
    
    return matchesSearch;
  });

  // Sort templates
  const sortedTemplates = sortColumn 
    ? [...filteredTemplates].sort((a, b) => {
        let valueA = a[sortColumn as keyof EmailTemplate];
        let valueB = b[sortColumn as keyof EmailTemplate];
        
        if (typeof valueA === 'string') valueA = valueA.toLowerCase();
        if (typeof valueB === 'string') valueB = valueB.toLowerCase();
        
        if (valueA < valueB) return sortDirection === "asc" ? -1 : 1;
        if (valueA > valueB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      })
    : filteredTemplates;

  // Get unique categories for tabs
  const categories = [...new Set(templates.map(t => t.category))];

  // Template form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (isEditDialogOpen && currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        [name]: value
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        [name]: value
      });
    }
  };

  const handleSwitchChange = (checked: boolean) => {
    if (isEditDialogOpen && currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        isShared: checked
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        isShared: checked
      });
    }
  };

  // CRUD operations
  const handleCreateTemplate = async () => {
    try {
      await onCreateTemplate(newTemplate);
      setIsCreateDialogOpen(false);
      setNewTemplate({
        name: "",
        subject: "",
        body: "",
        category: "general",
        isShared: false
      });
      toast({
        title: "Template Created",
        description: "Your email template has been created successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to Create Template",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!currentTemplate) return;
    
    try {
      await onUpdateTemplate(currentTemplate.id, currentTemplate);
      setIsEditDialogOpen(false);
      toast({
        title: "Template Updated",
        description: "Your email template has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Failed to Update Template",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async () => {
    if (!currentTemplate) return;
    
    try {
      await onDeleteTemplate(currentTemplate.id);
      setIsDeleteDialogOpen(false);
      toast({
        title: "Template Deleted",
        description: "Your email template has been deleted",
      });
    } catch (error) {
      toast({
        title: "Failed to Delete Template",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    try {
      await onDuplicateTemplate(template.id);
      toast({
        title: "Template Duplicated",
        description: "A copy of the template has been created",
      });
    } catch (error) {
      toast({
        title: "Failed to Duplicate Template",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-lg shadow">
        <CardHeader className="px-5 py-4 border-b border-border">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-semibold text-foreground">Email Templates</CardTitle>
              <CardDescription>Create and manage reseller-branded email templates</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="shared">Shared</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[250px] cursor-pointer" onClick={() => toggleSort("name")}>
                        <div className="flex items-center space-x-1">
                          <span>Template Name</span>
                          {sortColumn === "name" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("subject")}>
                        <div className="flex items-center space-x-1">
                          <span>Subject</span>
                          {sortColumn === "subject" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("category")}>
                        <div className="flex items-center space-x-1">
                          <span>Category</span>
                          {sortColumn === "category" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleSort("isShared")}>
                        <div className="flex items-center space-x-1">
                          <span>Shared</span>
                          {sortColumn === "isShared" && (
                            <ArrowUpDown className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedTemplates.length > 0 ? (
                      sortedTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.name}</TableCell>
                          <TableCell>{template.subject}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={template.isShared ? "default" : "outline"}>
                              {template.isShared ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setCurrentTemplate(template);
                                setIsPreviewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Preview</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setCurrentTemplate(template);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDuplicateTemplate(template)}
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Duplicate</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setCurrentTemplate(template);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          {searchTerm 
                            ? "No matching templates found" 
                            : activeTab === "all" 
                              ? "No templates created yet" 
                              : `No ${activeTab} templates found`}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="px-5 py-4 border-t border-border">
          <div className="text-sm text-muted-foreground">
            Shared templates are available to your customers. Create templates for welcome emails, support responses, and more.
          </div>
        </CardFooter>
      </Card>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Template</DialogTitle>
            <DialogDescription>
              Create a new email template for your customers
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={newTemplate.name}
                  onChange={handleInputChange}
                  placeholder="Welcome Email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="w-full border-input bg-transparent rounded-md border px-3 py-2"
                  value={newTemplate.category}
                  onChange={handleInputChange}
                >
                  <option value="general">General</option>
                  <option value="welcome">Welcome</option>
                  <option value="support">Support</option>
                  <option value="billing">Billing</option>
                  <option value="notification">Notification</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Line</Label>
              <Input
                id="subject"
                name="subject"
                value={newTemplate.subject}
                onChange={handleInputChange}
                placeholder="Welcome to {{company_name}}"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <textarea
                id="body"
                name="body"
                className="w-full min-h-[200px] border-input bg-transparent rounded-md border px-3 py-2 font-mono text-sm"
                value={newTemplate.body}
                onChange={handleInputChange}
                placeholder="Dear {{customer_name}},\n\nWelcome to {{company_name}}! We're excited to have you on board.\n\nYour account has been successfully created with the following details:\n\nEmail: {{customer_email}}\nDomain: {{domain_name}}\n\nIf you have any questions, please don't hesitate to contact our support team.\n\nBest regards,\n{{company_name}} Team"
              />
              <p className="text-xs text-muted-foreground">
                Use variables like {{customer_name}}, {{company_name}}, {{domain_name}}, etc. for dynamic content.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="shared"
                checked={newTemplate.isShared}
                onCheckedChange={handleSwitchChange}
              />
              <Label htmlFor="shared">Share template with customers</Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate}>
              <FileText className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      {currentTemplate && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Email Template</DialogTitle>
              <DialogDescription>
                Update your email template
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Template Name</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={currentTemplate.name}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <select
                    id="edit-category"
                    name="category"
                    className="w-full border-input bg-transparent rounded-md border px-3 py-2"
                    value={currentTemplate.category}
                    onChange={handleInputChange}
                  >
                    <option value="general">General</option>
                    <option value="welcome">Welcome</option>
                    <option value="support">Support</option>
                    <option value="billing">Billing</option>
                    <option value="notification">Notification</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject Line</Label>
                <Input
                  id="edit-subject"
                  name="subject"
                  value={currentTemplate.subject}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-body">Email Body</Label>
                <textarea
                  id="edit-body"
                  name="body"
                  className="w-full min-h-[200px] border-input bg-transparent rounded-md border px-3 py-2 font-mono text-sm"
                  value={currentTemplate.body}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-muted-foreground">
                  Use variables like {{customer_name}}, {{company_name}}, {{domain_name}}, etc. for dynamic content.
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-shared"
                  checked={currentTemplate.isShared}
                  onCheckedChange={handleSwitchChange}
                />
                <Label htmlFor="edit-shared">Share template with customers</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateTemplate}>
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview Template Dialog */}
      {currentTemplate && (
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Preview Email Template</DialogTitle>
              <DialogDescription>
                Preview how your email template will look
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="border rounded p-4 bg-gray-50">
                <div className="flex items-center mb-2">
                  <Mail className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span className="font-medium">{currentTemplate.subject}</span>
                </div>
                <div className="bg-white border rounded-md p-4 whitespace-pre-wrap">
                  {currentTemplate.body}
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-1">Template Variables</h4>
                <p className="text-xs text-blue-700">
                  When sent, variables like {{customer_name}} will be replaced with actual values.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Close
              </Button>
              <Button 
                onClick={() => {
                  setIsPreviewDialogOpen(false);
                  setIsEditDialogOpen(true);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {currentTemplate && (
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Template</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this template? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="font-medium">{currentTemplate.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{currentTemplate.subject}</p>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteTemplate}>
                <Trash className="h-4 w-4 mr-2" />
                Delete Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}