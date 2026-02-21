'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Subscription } from '@/src/lib/types';
import { TierKey, TIERS } from '@/src/lib/tiers';

interface UserContextType {
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tier: TierKey;
  siteLimit: number;
  siteCount: number;
  smsCount: number;
  smsLimit: number;
  subscriptionStatus: string;
  usage: {
    sitesUsed: number;
    sitesLimit: number;
    smsUsed: number;
    smsLimit: number;
    percentSites: number;
    percentSms: number;
  };
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setSiteCount: (count: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'sitewatch_user_id';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [siteCount, setSiteCount] = useState(0);
  const [smsCount, setSmsCount] = useState(0);

  // Load user from localStorage on mount (only user ID, not license key)
  useEffect(() => {
    const storedUserId = localStorage.getItem(STORAGE_KEY);
    if (storedUserId) {
      fetchUser(storedUserId);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Update site count periodically
  useEffect(() => {
    if (!user) return;

    const fetchSiteCount = async () => {
      try {
        const response = await fetch('/api/websites', {
          headers: { 'X-User-Id': user.id },
        });
        const data = await response.json();
        if (data.count !== undefined) {
          setSiteCount(data.count);
        }
        if (data.usage?.smsUsed !== undefined) {
          setSmsCount(data.usage.smsUsed);
        }
      } catch (error) {
        console.error('Failed to fetch site count:', error);
      }
    };

    fetchSiteCount();
    const interval = setInterval(fetchSiteCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/user?id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSubscription(data.subscription || null);
        localStorage.setItem(STORAGE_KEY, userId);
      } else {
        // Invalid user ID, clear it
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSubscription(data.subscription || null);
        localStorage.setItem(STORAGE_KEY, data.user.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSubscription(null);
        localStorage.setItem(STORAGE_KEY, data.user.id);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setSubscription(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshUser = async () => {
    if (user?.id) {
      await fetchUser(user.id);
    }
  };

  // Determine tier from user plan and subscription status
  const getEffectiveTier = (): TierKey => {
    if (!user) return 'free';
    
    // If user has an active subscription, use the plan from subscription
    if (subscription && ['active', 'trialing'].includes(subscription.status)) {
      return subscription.plan;
    }
    
    // Fall back to user's plan field
    return (user.plan as TierKey) || 'free';
  };

  const tier = getEffectiveTier();
  const subscriptionStatus = subscription?.status || 'inactive';
  
  const tierConfig = TIERS[tier];

  const usage = {
    sitesUsed: siteCount,
    sitesLimit: tierConfig.limit,
    smsUsed: smsCount,
    smsLimit: tierConfig.smsLimit,
    percentSites: Math.round((siteCount / tierConfig.limit) * 100) || 0,
    percentSms: tierConfig.smsLimit > 0 ? Math.round((smsCount / tierConfig.smsLimit) * 100) : 0,
  };

  const value: UserContextType = {
    user,
    subscription,
    isLoading,
    isAuthenticated: !!user,
    tier,
    siteLimit: tierConfig.limit,
    siteCount,
    smsCount,
    smsLimit: tierConfig.smsLimit,
    subscriptionStatus,
    usage,
    login,
    logout,
    signup,
    refreshUser,
    setSiteCount,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
