// Website monitoring types
export interface Website {
  id: string;
  url: string;
  name: string;
  status: 'up' | 'down' | 'unknown';
  lastChecked: string | null;
  sslExpiryDate: string | null;
  sslDaysRemaining: number | null;
  responseTime: number | null;
  lastError: string | null;
  createdAt: string;
  userId?: string;
}

export interface MonitorLog {
  id: string;
  websiteId: string;
  status: 'up' | 'down';
  responseTime: number | null;
  error: string | null;
  sslDaysRemaining: number | null;
  checkedAt: string;
}

// User and subscription types for freemium model
export interface User {
  id: string;
  email: string;
  passwordHash?: string | null;
  stripeCustomerId: string | null;
  plan: 'free' | 'starter' | 'pro' | 'business';
  phoneNumber: string | null;
  smsCountMonthly: number;
  smsCountResetAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'paused';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: 'starter' | 'pro' | 'business';
  createdAt: string;
  updatedAt: string;
}

export interface UserWithSubscription extends User {
  subscription: Subscription | null;
}

// API response types
export interface WebsiteListResponse {
  websites: Website[];
  tier: 'free' | 'starter' | 'pro' | 'business';
  limit: number;
  count: number;
  usage: {
    sitesUsed: number;
    sitesLimit: number;
    smsUsed: number;
    smsLimit: number;
  };
}

export interface TierLimits {
  sites: number;
  sms: number;
  checkFrequency: number;
}
