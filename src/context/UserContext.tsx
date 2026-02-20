'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserWithSubscription } from '@/src/lib/types';
import { TierKey } from '@/src/lib/tiers';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tier: TierKey;
  siteLimit: number;
  siteCount: number;
  smsCount: number;
  smsLimit: number;
  usage: {
    sitesUsed: number;
    sitesLimit: number;
    smsUsed: number;
    smsLimit: number;
    percentSites: number;
    percentSms: number;
  };
  login: (email: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setSiteCount: (count: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'sitewatch_user_id';

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [siteCount, setSiteCount] = useState(0);
  const [smsCount, setSmsCount] = useState(0);

  // Load user from localStorage on mount
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
        localStorage.setItem(STORAGE_KEY, userId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const refreshUser = async () => {
    if (user?.id) {
      await fetchUser(user.id);
    }
  };

  const tier = (user?.plan as TierKey) || 'free';
  const tierConfig = tier === 'free' ? { siteLimit: 1, smsLimit: 0 }
    : tier === 'starter' ? { siteLimit: 3, smsLimit: 10 }
    : tier === 'pro' ? { siteLimit: 10, smsLimit: 50 }
    : { siteLimit: 50, smsLimit: 200 };

  const usage = {
    sitesUsed: siteCount,
    sitesLimit: tierConfig.siteLimit,
    smsUsed: smsCount,
    smsLimit: tierConfig.smsLimit,
    percentSites: Math.round((siteCount / tierConfig.siteLimit) * 100),
    percentSms: tierConfig.smsLimit > 0 ? Math.round((smsCount / tierConfig.smsLimit) * 100) : 0,
  };

  const value: UserContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    tier,
    siteLimit: tierConfig.siteLimit,
    siteCount,
    smsCount,
    smsLimit: tierConfig.smsLimit,
    usage,
    login,
    logout,
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
