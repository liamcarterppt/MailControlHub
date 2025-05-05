import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DomainFormProps } from "@/lib/types";

const formSchema = z.object({
  name: z
    .string()
    .min(4, { message: "Domain must be at least 4 characters." })
    .regex(
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
      { message: "Please enter a valid domain name (e.g. example.com)" }
    ),
});

export function DomainForm({ onSuccess }: DomainFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Define form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  // Handle form submission
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/domains", values);
    },
    onSuccess: () => {
      toast({
        title: "Domain added",
        description: "Your domain has been added successfully.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/domains"] });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add domain. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to add domain:", error);
    },
  });

  // Submit handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Domain Name</FormLabel>
              <FormControl>
                <Input placeholder="example.com" {...field} />
              </FormControl>
              <FormDescription>
                Enter a domain name that you own. You'll need to verify your 
                ownership by adding DNS records.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Adding..." : "Add Domain"}
        </Button>
      </form>
    </Form>
  );
}
