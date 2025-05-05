import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MoreVertical, Search, Trash2, Edit, Eye, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { EmailTemplate } from "@shared/schema";

// Form validation schema for creating/editing templates
const templateFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  subject: z.string().min(2, "Subject must be at least 2 characters"),
  bodyHtml: z.string().min(5, "HTML body must be at least 5 characters"),
  bodyText: z.string().optional(),
  category: z.string().default("general"),
  variables: z.any().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

export default function EmailTemplates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [templateToEdit, setTemplateToEdit] = useState<EmailTemplate | null>(null);
  const [templateToView, setTemplateToView] = useState<EmailTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  // Form setup for template create/edit
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      subject: "",
      bodyHtml: "",
      bodyText: "",
      category: "general",
      variables: {},
    },
  });

  // Fetch all templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['/api/email-templates'],
    enabled: !!user,
  });

  // Send test email mutation
  const sendTestEmailMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const res = await apiRequest('POST', `/api/email-templates/${templateId}/test`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "A test email has been sent to your email address",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send test email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const res = await apiRequest('POST', '/api/email-templates', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Template created",
        description: "Email template has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TemplateFormValues }) => {
      const res = await apiRequest('PUT', `/api/email-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsCreateOpen(false);
      setTemplateToEdit(null);
      form.reset();
      toast({
        title: "Template updated",
        description: "Email template has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/email-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
      toast({
        title: "Template deleted",
        description: "Email template has been deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get unique categories from templates
  const categories = Array.from(new Set(templates.map((template: EmailTemplate) => template.category)));

  // Filter templates based on selected category and search query
  const filteredTemplates = templates.filter((template: EmailTemplate) => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = searchQuery === "" || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle template form submission
  const onSubmit = (data: TemplateFormValues) => {
    if (templateToEdit) {
      updateTemplateMutation.mutate({ id: templateToEdit.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  // Open edit dialog with template data
  const handleEditTemplate = (template: EmailTemplate) => {
    setTemplateToEdit(template);
    form.reset({
      name: template.name,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText || "",
      category: template.category || "general",
      variables: template.variables || {},
    });
    setIsCreateOpen(true);
  };

  // Open view dialog with template data
  const handleViewTemplate = (template: EmailTemplate) => {
    setTemplateToView(template);
    setIsViewOpen(true);
  };

  // Prepare to delete a template
  const handleDeleteTemplate = (template: EmailTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };

  // Handle sending a test email
  const handleSendTestEmail = (templateId: number) => {
    sendTestEmailMutation.mutate(templateId);
  };

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Email Templates</h1>
        <Button
          onClick={() => {
            setTemplateToEdit(null);
            form.reset({
              name: "",
              subject: "",
              bodyHtml: "",
              bodyText: "",
              category: "general",
              variables: {},
            });
            setIsCreateOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" /> Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search templates..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bg-card rounded-lg border shadow-sm">
            <div className="p-3 font-medium">Categories</div>
            <div className="px-3 pb-3">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${
                  selectedCategory === "all"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary"
                }`}
              >
                All Templates
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${
                    selectedCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="bg-card rounded-lg border shadow p-6 text-center">
              <h3 className="text-xl font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "No templates match your search criteria."
                  : "You haven't created any templates yet."}
              </p>
              <Button
                onClick={() => {
                  setTemplateToEdit(null);
                  form.reset();
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Create your first template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template: EmailTemplate) => (
                <Card key={template.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg line-clamp-1" title={template.name}>
                        {template.name}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="-mt-1">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewTemplate(template)}>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSendTestEmail(template.id)}>
                            <Mail className="mr-2 h-4 w-4" /> Send Test
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteTemplate(template)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="line-clamp-1" title={template.subject}>
                      {template.subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground pb-3">
                    <div className="bg-muted p-2 rounded-md h-20 overflow-hidden relative">
                      <div className="opacity-70 text-xs">
                        {template.bodyHtml.replace(/<[^>]*>/g, " ").substring(0, 150)}...
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card opacity-50"></div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between text-xs text-muted-foreground">
                    <div>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary">
                        {template.category}
                      </span>
                    </div>
                    <div>
                      {new Date(template.updatedAt).toLocaleDateString()}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{templateToEdit ? "Edit Template" : "Create New Template"}</DialogTitle>
            <DialogDescription>
              Create reusable email templates with variables that can be replaced when sending.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Welcome Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="notification">Notification</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="welcome">Welcome</SelectItem>
                          <SelectItem value="reset-password">Reset Password</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Line</FormLabel>
                    <FormControl>
                      <Input placeholder="Welcome to our service!" {...field} />
                    </FormControl>
                    <FormDescription>
                      You can use variables like {'{{name}}'} which will be replaced when sending.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Tabs defaultValue="html">
                <TabsList className="mb-2">
                  <TabsTrigger value="html">HTML Body</TabsTrigger>
                  <TabsTrigger value="text">Plain Text (Optional)</TabsTrigger>
                </TabsList>
                <TabsContent value="html">
                  <FormField
                    control={form.control}
                    name="bodyHtml"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>HTML Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="<h1>Welcome, {{name}}!</h1><p>Thank you for joining our service.</p>"
                            className="font-mono min-h-[300px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          HTML content that supports variables like {'{{name}}'}, {'{{company}}'},
                          etc.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                <TabsContent value="text">
                  <FormField
                    control={form.control}
                    name="bodyText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plain Text Content</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Welcome, {{name}}! Thank you for joining our service."
                            className="font-mono min-h-[300px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Plain text fallback for email clients that don't support HTML.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setTemplateToEdit(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                  {createTemplateMutation.isPending || updateTemplateMutation.isPending ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : templateToEdit ? (
                    "Update Template"
                  ) : (
                    "Create Template"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Template Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{templateToView?.name}</DialogTitle>
            <DialogDescription>
              Subject: {templateToView?.subject}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="preview">
            <TabsList className="mb-4">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="html">HTML Source</TabsTrigger>
              {templateToView?.bodyText && (
                <TabsTrigger value="text">Plain Text</TabsTrigger>
              )}
            </TabsList>
            <TabsContent value="preview" className="border rounded-md p-4">
              <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: templateToView?.bodyHtml || "" }}></div>
            </TabsContent>
            <TabsContent value="html">
              <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                {templateToView?.bodyHtml}
              </pre>
            </TabsContent>
            {templateToView?.bodyText && (
              <TabsContent value="text">
                <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {templateToView.bodyText}
                </pre>
              </TabsContent>
            )}
          </Tabs>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setIsViewOpen(false);
                handleEditTemplate(templateToView as EmailTemplate);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit Template
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSendTestEmail(templateToView?.id as number)}
              disabled={sendTestEmailMutation.isPending}
            >
              {sendTestEmailMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary mr-2"></div>
                  Sending...
                </div>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" /> Send Test Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTemplateMutation.mutate(templateToDelete?.id as number)}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Deleting...
                </div>
              ) : (
                "Delete Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}