import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Get user friendly format for bytes (KB, MB, GB)
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Format currency as $XX.XX
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount / 100);
}

// Format date as relative time (e.g., "2 hours ago", "Yesterday", etc.)
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "minute" : "minutes"} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    return "Yesterday";
  }
  if (diffInDays < 30) {
    return `${diffInDays} days ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
}

// Format date as MM/DD/YYYY
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// Get icon and color for service status
export function getStatusInfo(status: string): { 
  color: string;
  bgColor: string;
  label: string;
} {
  switch (status) {
    case "running":
      return { 
        color: "text-success", 
        bgColor: "bg-success/10", 
        label: "Running" 
      };
    case "stopped":
      return { 
        color: "text-danger", 
        bgColor: "bg-danger/10", 
        label: "Stopped" 
      };
    case "needs_update":
      return { 
        color: "text-warning", 
        bgColor: "bg-warning/10", 
        label: "Needs Update" 
      };
    case "error":
      return { 
        color: "text-danger", 
        bgColor: "bg-danger/10", 
        label: "Error" 
      };
    default:
      return { 
        color: "text-muted-foreground", 
        bgColor: "bg-muted", 
        label: status 
      };
  }
}

// Get icon and color for activity action
export function getActivityInfo(action: string): {
  icon: string;
  bgColor: string;
  iconColor: string;
} {
  if (action.startsWith("email_account.")) {
    return {
      icon: "user-plus",
      bgColor: "bg-primary/10",
      iconColor: "text-primary"
    };
  } else if (action.startsWith("domain.")) {
    return {
      icon: "globe",
      bgColor: "bg-secondary/10",
      iconColor: "text-secondary"
    };
  } else if (action.startsWith("security.")) {
    return {
      icon: "shield",
      bgColor: "bg-success/10",
      iconColor: "text-success"
    };
  } else if (action.startsWith("subscription.")) {
    return {
      icon: "credit-card",
      bgColor: "bg-primary/10",
      iconColor: "text-primary"
    };
  } else if (action.startsWith("server_config.")) {
    return {
      icon: "settings",
      bgColor: "bg-warning/10",
      iconColor: "text-warning"
    };
  } else if (action.startsWith("referral.")) {
    return {
      icon: "users",
      bgColor: "bg-secondary/10",
      iconColor: "text-secondary"
    };
  } else {
    return {
      icon: "alert-circle",
      bgColor: "bg-muted",
      iconColor: "text-muted-foreground"
    };
  }
}

// Format activity description
export function formatActivityDescription(action: string, details: any): string {
  switch (action) {
    case "email_account.create":
      return `New mail account ${details.username}@${details.domain} created`;
    case "email_account.delete":
      return `Mail account ${details.username}@${details.domain} deleted`;
    case "email_account.activate":
      return `Mail account ${details.username}@${details.domain} activated`;
    case "email_account.deactivate":
      return `Mail account ${details.username}@${details.domain} deactivated`;
    case "domain.create":
      return `Domain ${details.name} added`;
    case "domain.verify":
      return `Domain ${details.name} verified`;
    case "domain.delete":
      return `Domain ${details.name} removed`;
    case "security.update":
      return `Security ${details.component} updated`;
    case "server_config.update":
      return `Server configuration ${details.name} updated`;
    case "subscription.create":
      return `New subscription created`;
    case "subscription.cancel":
      return `Subscription canceled`;
    case "referral.completed":
      return `Referral reward earned`;
    case "user.register":
      return `User ${details.username} registered`;
    default:
      return action.replace(/\./g, " ");
  }
}
