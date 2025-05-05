import React from "react";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  HelpCircle,
  Menu,
  X
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  notifications?: number;
}

export function Header({ isSidebarOpen, toggleSidebar, notifications = 0 }: HeaderProps) {
  const isMobile = useMobile();

  return (
    <header className="bg-white border-b border-border shadow-sm z-10">
      <div className="px-4 py-3 flex items-center justify-between">
        {isMobile && (
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        )}
        
        <div className="flex items-center space-x-4 ml-auto">
          <div className="relative">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-700 hover:text-primary relative"
            >
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute top-0 right-0 w-2 h-2 p-0" 
                />
              )}
            </Button>
          </div>
          <div className="relative">
            <Button 
              variant="ghost"
              className="text-slate-700 hover:text-primary flex items-center"
            >
              <span className="hidden md:inline-block mr-2 text-sm">Help</span>
              <HelpCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
