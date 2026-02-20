import { createClient } from '@supabase/supabase-js';
import { Website, MonitorLog, User, Subscription } from './types';
import { TIERS, TierKey, FREE_TIER_LIMIT, PAID_TIER_LIMIT } from './tiers';

// Re-export tier info
export { TIERS, FREE_TIER_LIMIT, PAID_TIER_LIMIT };
export type { TierKey } from './tiers';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

// Initialize Supabase client only if credentials are available
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Flag to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabase !== null;
};

// In-memory fallback storage for development/testing (based on Donut's pricing: 3/15/50)
const inMemoryStorage = {
  websites: new Map<string, Website[]>(), // licenseKey -> websites
  logs: [] as MonitorLog[],
  users: new Map<string, User>(),
  subscriptions: new Map<string, Subscription>(),
  licenseTiers: new Map<string, TierKey>(),
};

// Helper to get storage key
function getStorageKey(licenseKey: string | null): string {
  return licenseKey || 'free';
}

// Get user's tier
export function getUserTier(licenseKey: string | null): TierKey {
  if (!licenseKey) return 'free';
  return inMemoryStorage.licenseTiers.get(licenseKey) || 'free';
}

export function setUserTier(licenseKey: string, tier: TierKey) {
  inMemoryStorage.licenseTiers.set(licenseKey, tier);
}

// Website operations
export async function getAllWebsites(licenseKey: string | null = null): Promise<Website[]> {
  const key = getStorageKey(licenseKey);
  return inMemoryStorage.websites.get(key) || [];
}

export async function getWebsiteCount(licenseKey: string | null = null): Promise<number> {
  const websites = await getAllWebsites(licenseKey);
  return websites.length;
}

export async function canAddWebsite(licenseKey: string | null, tier: TierKey): Promise<{ 
  allowed: boolean; 
  limit: number; 
  current: number;
  tier: TierKey;
}> {
  const current = await getWebsiteCount(licenseKey);
  const limit = TIERS[tier].limit;
  
  return {
    allowed: current < limit,
    limit,
    current,
    tier,
  };
}

export async function getWebsiteById(id: string, licenseKey: string | null = null): Promise<Website | null> {
  const websites = await getAllWebsites(licenseKey);
  return websites.find(site => site.id === id) || null;
}

export async function addWebsite(
  website: Omit<Website, 'id' | 'createdAt'>, 
  licenseKey: string | null = null
): Promise<Website> {
  const key = getStorageKey(licenseKey);
  
  if (!inMemoryStorage.websites.has(key)) {
    inMemoryStorage.websites.set(key, []);
  }
  
  const newSite: Website = {
    ...website,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };
  
  inMemoryStorage.websites.get(key)!.push(newSite);
  return newSite;
}

export async function updateWebsite(
  id: string, 
  updates: Partial<Website>, 
  licenseKey: string | null = null
): Promise<Website | null> {
  const websites = await getAllWebsites(licenseKey);
  const index = websites.findIndex(site => site.id === id);
  
  if (index === -1) return null;
  
  websites[index] = { ...websites[index], ...updates };
  return websites[index];
}

export async function deleteWebsite(id: string, licenseKey: string | null = null): Promise<boolean> {
  const key = getStorageKey(licenseKey);
  const websites = inMemoryStorage.websites.get(key);
  
  if (websites) {
    const index = websites.findIndex(site => site.id === id);
    if (index !== -1) {
      websites.splice(index, 1);
      return true;
    }
  }
  
  // Search all storages if not found in specified key
  for (const [, storage] of inMemoryStorage.websites) {
    const index = storage.findIndex(site => site.id === id);
    if (index !== -1) {
      storage.splice(index, 1);
      return true;
    }
  }
  
  return false;
}

// Log operations
export async function addMonitorLog(log: Omit<MonitorLog, 'id'>): Promise<MonitorLog> {
  const newLog: MonitorLog = {
    ...log,
    id: Math.random().toString(36).substring(2, 9),
  };
  
  inMemoryStorage.logs.push(newLog);
  
  // Keep only last 1000 logs
  if (inMemoryStorage.logs.length > 1000) {
    inMemoryStorage.logs.shift();
  }
  
  return newLog;
}

export async function getAllLogs(): Promise<MonitorLog[]> {
  return inMemoryStorage.logs;
}

export async function getLogsForWebsite(websiteId: string): Promise<MonitorLog[]> {
  return inMemoryStorage.logs
    .filter(log => log.websiteId === websiteId)
    .slice(-50);
}

// User operations
export async function getUser(userId: string): Promise<User | null> {
  return inMemoryStorage.users.get(userId) || null;
}

// Alias for compatibility
export const getUserById = getUser;

export async function getUserByEmail(email: string): Promise<User | null> {
  for (const user of inMemoryStorage.users.values()) {
    if (user.email === email) return user;
  }
  return null;
}

export async function createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const newUser: User = {
    ...user,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };
  
  inMemoryStorage.users.set(newUser.id, newUser);
  return newUser;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  const user = inMemoryStorage.users.get(userId);
  if (!user) return null;
  
  const updated = { ...user, ...updates };
  inMemoryStorage.users.set(userId, updated);
  return updated;
}

// Subscription operations
export async function getSubscription(userId: string): Promise<Subscription | null> {
  return inMemoryStorage.subscriptions.get(userId) || null;
}

export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  return inMemoryStorage.subscriptions.get(userId) || null;
}

export async function createSubscription(
  subscription: Omit<Subscription, 'id' | 'createdAt'>
): Promise<Subscription> {
  const newSub: Subscription = {
    ...subscription,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };
  
  inMemoryStorage.subscriptions.set(newSub.userId, newSub);
  return newSub;
}

export async function updateSubscription(
  subscriptionId: string, 
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  // Find subscription by ID
  for (const [userId, sub] of inMemoryStorage.subscriptions) {
    if (sub.id === subscriptionId) {
      const updated = { ...sub, ...updates };
      inMemoryStorage.subscriptions.set(userId, updated);
      return updated;
    }
  }
  return null;
}

// SMS tracking (for paid tiers)
export async function canSendSMS(userId: string, tier: TierKey): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;
  
  const tierInfo = TIERS[tier];
  if (tier === 'free') return false; // Free tier gets no SMS
  
  // Reset monthly count if needed
  const now = new Date();
  const resetDate = new Date(user.smsCountResetAt || now);
  
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    await updateUser(userId, {
      smsCountMonthly: 0,
      smsCountResetAt: now.toISOString(),
    });
    return true;
  }
  
  // Check limit ( generous limit for MVP - not strictly enforced)
  return user.smsCountMonthly < 100; // Generous limit
}

export async function incrementSMSCount(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  if (!user) return false;
  
  const now = new Date();
  const resetDate = new Date(user.smsCountResetAt || now);
  
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    await updateUser(userId, {
      smsCountMonthly: 1,
      smsCountResetAt: now.toISOString(),
    });
    return true;
  }
  
  await updateUser(userId, {
    smsCountMonthly: user.smsCountMonthly + 1,
  });
  return true;
}
