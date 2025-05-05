import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AvatarFallback, Avatar } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  Globe,
  List,
  Settings,
  ShieldCheck,
  CreditCard,
  Share2,
  LogOut,
  User,
  Mail
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

function NavItem({ href, icon, label, active }: NavItemProps) {
  return (
    <li>
      <Link 
        href={href}
        className={cn(
          "flex items-center px-4 py-3 hover:bg-slate-800 hover:text-slate-100",
          active 
            ? "text-slate-100 bg-slate-800" 
            : "text-slate-300"
        )}
      >
        <span className="w-5">{icon}</span>
        <span className="ml-3">{label}</span>
      </Link>
    </li>
  );
}

interface SidebarProps {
  user: {
    id: number;
    name: string;
    role: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const isMobile = useMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout", {});
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      window.location.href = "/";
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Close sidebar on mobile when clicking a link
  const handleNavClick = () => {
    if (isMobile) {
      onClose();
    }
  };

  return (
    <aside 
      className={cn(
        "flex flex-col bg-slate-900 text-white z-20 h-full",
        isMobile ? "absolute inset-y-0 left-0 w-64 transform transition-transform duration-200 ease-in-out" : "w-64",
        isMobile && !isOpen && "-translate-x-full"
      )}
    >
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="text-primary text-2xl">
            <span className="fa-stack">
              <i className="fas fa-square fa-stack-2x"></i>
              <i className="fas fa-inbox fa-stack-1x fa-inverse"></i>
            </span>
          </div>
          <h1 className="text-xl font-semibold">Mail-in-a-Box</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">Control Panel</p>
      </div>
      
      <nav className="flex-1 py-4 overflow-y-auto" onClick={handleNavClick}>
        <ul className="space-y-1">
          <NavItem 
            href="/dashboard" 
            icon={<LayoutDashboard size={18} />} 
            label="Dashboard" 
            active={location === "/dashboard"} 
          />
          <NavItem 
            href="/users" 
            icon={<Users size={18} />} 
            label="User Management" 
            active={location === "/users"} 
          />
          <NavItem 
            href="/domains" 
            icon={<Globe size={18} />} 
            label="Domain Management" 
            active={location === "/domains"} 
          />
          <NavItem 
            href="/mail-queue" 
            icon={<List size={18} />} 
            label="Mail Queue" 
            active={location === "/mail-queue"} 
          />
          <NavItem 
            href="/server-config" 
            icon={<Settings size={18} />} 
            label="Server Configuration" 
            active={location === "/server-config"} 
          />
          <NavItem 
            href="/security-settings" 
            icon={<ShieldCheck size={18} />} 
            label="Security Settings" 
            active={location === "/security-settings"} 
          />
          <NavItem 
            href="/billing" 
            icon={<CreditCard size={18} />} 
            label="Billing" 
            active={location === "/billing"} 
          />
          <NavItem 
            href="/referrals" 
            icon={<Share2 size={18} />} 
            label="Referrals" 
            active={location === "/referrals"} 
          />
          <NavItem 
            href="/email-settings" 
            icon={<Mail size={18} />} 
            label="Email Settings" 
            active={location === "/email-settings"} 
          />
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarFallback className="bg-primary text-white">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
          </div>
        </div>
        <div className="mt-4 flex space-x-2">
          <Link href="/settings">
            <Button 
              variant="secondary" 
              size="sm"
              className="flex-1 py-2 text-xs text-center bg-slate-800 hover:bg-slate-700"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Button>
          </Link>
          <Button 
            variant="secondary"
            size="sm"
            className="flex-1 py-2 text-xs text-center bg-slate-800 hover:bg-slate-700"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
