export interface StatusCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  info?: string;
  infoStatus?: "success" | "warning" | "danger" | "neutral";
  progressPercentage?: number;
  progressTotal?: string;
}

export interface SystemStatusProps {
  services: ServiceStatus[];
}

export interface ServiceStatus {
  id: number;
  name: string;
  status: "running" | "stopped" | "needs_update" | "error";
  message?: string;
  lastChecked: string; // ISO date string
}

export interface RecentActivityProps {
  activities: ActivityItem[];
  showViewAll?: boolean;
}

export interface ActivityItem {
  id: number;
  action: string;
  details: any;
  createdAt: string; // ISO date string
  user?: {
    id: number;
    name: string;
  };
}

export interface SubscriptionStatusProps {
  plan: {
    name: string;
    pricePerMonth: number;
    renewDate: string; // ISO date string
    features: string[];
  };
}

export interface ReferralStatsProps {
  stats: {
    totalEarnings: number;
    successfulReferrals: number;
    pendingReferrals: number;
  };
  referralCode: string;
}

export interface StorageUsageProps {
  used: number; // in bytes
  total: number; // in bytes
}

export interface MailQueueProps {
  stats: {
    pending: number;
    sent: number;
    failed: number;
  };
}

export interface EmailAccount {
  id: number;
  username: string;
  domainId: number;
  userId: number;
  storageUsed: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  domain: {
    id: number;
    name: string;
  };
}

export interface EmailAccountFormProps {
  onSuccess: () => void;
  domains: Domain[];
}

export interface EmailAccountListProps {
  accounts: EmailAccount[];
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, isActive: boolean) => void;
}

export interface Domain {
  id: number;
  name: string;
  isVerified: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface DomainFormProps {
  onSuccess: () => void;
}

export interface DomainListProps {
  domains: Domain[];
  onDelete: (id: number) => void;
  onVerify: (id: number) => void;
}

export interface ServerConfig {
  id: number;
  name: string;
  value: string;
  description: string;
}

export interface ServerConfigFormProps {
  configs: ServerConfig[];
  onUpdate: (id: number, value: string) => void;
}

export interface SecuritySetting {
  id: number;
  name: string;
  value: string;
  description: string;
}

export interface SecuritySettingsFormProps {
  settings: SecuritySetting[];
  onUpdate: (id: number, value: string) => void;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  emailAccountLimit: number;
  domainLimit: number;
  storageLimit: number;
  features: string[];
  isActive: boolean;
  stripePriceId?: string;
}

export interface PlanSelectorProps {
  plans: SubscriptionPlan[];
  currentPlanId?: number;
  onSelectPlan: (plan: SubscriptionPlan) => void;
}

export interface PaymentFormProps {
  selectedPlan: SubscriptionPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

export interface Referral {
  id: number;
  referredUserId: number;
  status: "pending" | "completed" | "expired";
  reward: number;
  createdAt: string;
  completedAt?: string;
  referredUser?: {
    id: number;
    email: string;
    name: string;
  };
}

export interface ReferralLinkProps {
  code: string;
}
