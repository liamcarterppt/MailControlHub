import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useLocation, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";

interface MainLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export function MainLayout({ children, pageTitle }: MainLayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Fetch user data
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Toggle sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById("sidebar-container");
      const toggleButton = document.getElementById("sidebar-toggle");
      
      if (
        sidebar && 
        !sidebar.contains(event.target as Node) &&
        toggleButton && 
        !toggleButton.contains(event.target as Node) &&
        isSidebarOpen
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSidebarOpen]);

  // Reset sidebar on location change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  // Handle authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100">
        <div className="w-[400px] space-y-4 p-4">
          <div className="flex gap-4 items-center">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
          <Skeleton className="h-[150px] w-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[250px]" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    if (location !== "/login" && location !== "/register") {
      return <Redirect to="/login" />;
    }
  }

  // If login or register page, don't show layout
  if (location === "/login" || location === "/register") {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div id="sidebar-container">
        <Sidebar 
          user={user} 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          toggleSidebar={toggleSidebar} 
          notifications={0}
        />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
          <div className="max-w-7xl mx-auto">
            {pageTitle && (
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-slate-900">{pageTitle}</h1>
              </div>
            )}
            
            {children}
          </div>
        </main>
      </div>
      
      <Toaster />
    </div>
  );
}
