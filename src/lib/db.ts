import { createClient } from '@supabase/supabase-js';
import { Website, MonitorLog, User, Subscription } from './types';
import { TIERS, TierKey } from './tiers';

// Re-export tier info
export { TIERS };
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

// In-memory fallback storage for development/testing (based on Donut's pricing: 1/3/10/50)
const inMemoryStorage = {
  websites: new Map<string, Website[]>(), // userId -> websites
  logs: [] as MonitorLog[],
  users: new Map<string, User>(),
  subscriptions: new Map<string, Subscription>(), // userId -> subscription
  userTiers: new Map<string, TierKey>(), // userId -> tier (for upgraded users)
};

// Website operations
export async function getAllWebsites(userId: string): Promise<Website[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('websites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  }
  return inMemoryStorage.websites.get(userId) || [];
}

export async function getWebsiteCount(userId: string): Promise<number> {
  if (isSupabaseConfigured() && supabase) {
    const { count } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count || 0;
  }
  const websites = inMemoryStorage.websites.get(userId) || [];
  return websites.length;
}

export async function canAddWebsite(userId: string, tier: TierKey): Promise<{ 
  allowed: boolean; 
  limit: number; 
  current: number;
  tier: TierKey;
}> {
  const current = await getWebsiteCount(userId);
  const limit = TIERS[tier].limit;
  
  return {
    allowed: current < limit,
    limit,
    current,
    tier,
  };
}

export async function getWebsiteById(id: string, userId: string): Promise<Website | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('websites')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    return data || null;
  }
  
  const websites = inMemoryStorage.websites.get(userId) || [];
  return websites.find(site => site.id === id) || null;
}

export async function addWebsite(
  website: Omit<Website, 'id' | 'createdAt' | 'userId'>, 
  userId: string
): Promise<Website> {
  const newSite: Website = {
    ...website,
    id: Math.random().toString(36).substring(2, 9),
    userId,
    createdAt: new Date().toISOString(),
  };
  
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('websites')
      .insert({
        id: newSite.id,
        user_id: userId,
        url: website.url,
        name: website.name,
        status: website.status,
        last_checked: website.lastChecked,
        ssl_expiry_date: website.sslExpiryDate,
        ssl_days_remaining: website.sslDaysRemaining,
        response_time: website.responseTime,
        last_error: website.lastError,
        created_at: newSite.createdAt,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // In-memory fallback
  if (!inMemoryStorage.websites.has(userId)) {
    inMemoryStorage.websites.set(userId, []);
  }
  
  inMemoryStorage.websites.get(userId)!.push(newSite);
  return newSite;
}

export async function updateWebsite(
  id: string, 
  updates: Partial<Website>, 
  userId: string
): Promise<Website | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('websites')
      .update({
        url: updates.url,
        name: updates.name,
        status: updates.status,
        last_checked: updates.lastChecked,
        ssl_expiry_date: updates.sslExpiryDate,
        ssl_days_remaining: updates.sslDaysRemaining,
        response_time: updates.responseTime,
        last_error: updates.lastError,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }
  
  // In-memory fallback
  const websites = inMemoryStorage.websites.get(userId) || [];
  const index = websites.findIndex(site => site.id === id);
  
  if (index === -1) return null;
  
  websites[index] = { ...websites[index], ...updates };
  return websites[index];
}

export async function deleteWebsite(id: string, userId: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('websites')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    return !error;
  }
  
  // In-memory fallback
  const websites = inMemoryStorage.websites.get(userId);
  
  if (websites) {
    const index = websites.findIndex(site => site.id === id);
    if (index !== -1) {
      websites.splice(index, 1);
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
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return data || null;
  }
  
  return inMemoryStorage.users.get(userId) || null;
}

// Alias for compatibility
export const getUserById = getUser;

export async function getUserByEmail(email: string): Promise<User | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    return data || null;
  }
  
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
  
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: newUser.id,
        email: user.email,
        password_hash: user.passwordHash,
        stripe_customer_id: user.stripeCustomerId,
        plan: user.plan,
        phone_number: user.phoneNumber,
        sms_count_monthly: user.smsCountMonthly,
        sms_count_reset_at: user.smsCountResetAt,
        created_at: newUser.createdAt,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // In-memory fallback
  inMemoryStorage.users.set(newUser.id, newUser);
  return newUser;
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
  if (isSupabaseConfigured() && supabase) {
    const updateData: Record<string, unknown> = {};
    
    if (updates.email) updateData.email = updates.email;
    if (updates.passwordHash) updateData.password_hash = updates.passwordHash;
    if (updates.stripeCustomerId !== undefined) updateData.stripe_customer_id = updates.stripeCustomerId;
    if (updates.plan) updateData.plan = updates.plan;
    if (updates.phoneNumber !== undefined) updateData.phone_number = updates.phoneNumber;
    if (updates.smsCountMonthly !== undefined) updateData.sms_count_monthly = updates.smsCountMonthly;
    if (updates.smsCountResetAt) updateData.sms_count_reset_at = updates.smsCountResetAt;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }
  
  // In-memory fallback
  const user = inMemoryStorage.users.get(userId);
  if (!user) return null;
  
  const updated = { ...user, ...updates };
  inMemoryStorage.users.set(userId, updated);
  return updated;
}

// Subscription operations
export async function getSubscription(userId: string): Promise<Subscription | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return data || null;
  }
  
  return inMemoryStorage.subscriptions.get(userId) || null;
}

// Alias for compatibility
export const getSubscriptionByUserId = getSubscription;

export async function createSubscription(
  subscription: Omit<Subscription, 'id' | 'createdAt'>
): Promise<Subscription> {
  const newSub: Subscription = {
    ...subscription,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
  };
  
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        id: newSub.id,
        user_id: subscription.userId,
        stripe_subscription_id: subscription.stripeSubscriptionId,
        status: subscription.status,
        plan: subscription.plan,
        current_period_start: subscription.currentPeriodStart,
        current_period_end: subscription.currentPeriodEnd,
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        created_at: newSub.createdAt,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // In-memory fallback
  inMemoryStorage.subscriptions.set(subscription.userId, newSub);
  return newSub;
}

export async function updateSubscription(
  subscriptionId: string, 
  updates: Partial<Subscription>
): Promise<Subscription | null> {
  if (isSupabaseConfigured() && supabase) {
    const updateData: Record<string, unknown> = {};
    
    if (updates.status) updateData.status = updates.status;
    if (updates.plan) updateData.plan = updates.plan;
    if (updates.currentPeriodStart) updateData.current_period_start = updates.currentPeriodStart;
    if (updates.currentPeriodEnd) updateData.current_period_end = updates.currentPeriodEnd;
    if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();
    
    if (error) return null;
    return data;
  }
  
  // In-memory fallback
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
  if (tier === 'free') return false; // Free tier gets no SMS
  
  const user = await getUser(userId);
  if (!user) return false;
  
  const tierInfo = TIERS[tier];
  // All paid tiers have SMS limits > 0
  
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
  
  // Check limit
  return user.smsCountMonthly < tierInfo.smsLimit;
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

// Set user tier (for in-memory fallback)
export function setUserTier(userId: string, tier: TierKey) {
  inMemoryStorage.userTiers.set(userId, tier);
}

export function getUserTier(userId: string): TierKey {
  return inMemoryStorage.userTiers.get(userId) || 'free';
}
