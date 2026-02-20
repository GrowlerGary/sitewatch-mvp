'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LicenseContextType {
  licenseKey: string | null;
  isPaid: boolean;
  isLoading: boolean;
  tier: 'free' | 'paid';
  siteLimit: number;
  siteCount: number;
  setLicenseKey: (key: string | null) => Promise<boolean>;
  validateLicense: (key: string) => Promise<boolean>;
  clearLicense: () => void;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

const STORAGE_KEY = 'sitewatch_license_key';
const FREE_TIER_LIMIT = 1;
const PAID_TIER_LIMIT = 50;

export function LicenseProvider({ children }: { children: ReactNode }) {
  const [licenseKey, setLicenseKeyState] = useState<string | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [siteCount, setSiteCount] = useState(0);

  // Load license from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      validateLicense(stored);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Update site count periodically
  useEffect(() => {
    const fetchSiteCount = async () => {
      try {
        const headers: Record<string, string> = {};
        if (licenseKey) {
          headers['X-License-Key'] = licenseKey;
        }
        const response = await fetch('/api/websites', { headers });
        const data = await response.json();
        if (data.count !== undefined) {
          setSiteCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch site count:', error);
      }
    };

    fetchSiteCount();
    const interval = setInterval(fetchSiteCount, 30000);
    return () => clearInterval(interval);
  }, [licenseKey]);

  const validateLicense = async (key: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/license', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key }),
      });

      const data = await response.json();
      
      if (data.valid) {
        setLicenseKeyState(key);
        setIsPaid(true);
        localStorage.setItem(STORAGE_KEY, key);
        return true;
      } else {
        setLicenseKeyState(null);
        setIsPaid(false);
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
    } catch (error) {
      console.error('License validation error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const setLicenseKey = async (key: string | null): Promise<boolean> => {
    if (key) {
      return validateLicense(key);
    } else {
      clearLicense();
      return true;
    }
  };

  const clearLicense = () => {
    setLicenseKeyState(null);
    setIsPaid(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: LicenseContextType = {
    licenseKey,
    isPaid,
    isLoading,
    tier: isPaid ? 'paid' : 'free',
    siteLimit: isPaid ? PAID_TIER_LIMIT : FREE_TIER_LIMIT,
    siteCount,
    setLicenseKey,
    validateLicense,
    clearLicense,
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
