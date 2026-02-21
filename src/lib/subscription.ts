import { TierKey, TIERS } from './tiers';
import { supabase, isSupabaseConfigured } from './db';

// In-memory tier storage for fallback
const userTiers = new Map<string, TierKey>();

/**
 * Get a user's effective tier based on their subscription status
 * This checks both the user's plan field and their active subscription
 */
export async function getUserEffectiveTier(userId: string): Promise<TierKey> {
  if (!userId) return 'free';

  if (isSupabaseConfigured() && supabase) {
    // First check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscription) {
      return subscription.plan as TierKey;
    }

    // Fall back to user's plan field
    const { data: user } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    return (user?.plan as TierKey) || 'free';
  }

  // In-memory fallback
  return userTiers.get(userId) || 'free';
}

/**
 * Check if a user has an active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  if (!userId) return false;

  if (isSupabaseConfigured() && supabase) {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .limit(1)
      .single();

    return !!subscription;
  }

  // In-memory fallback
  const tier = userTiers.get(userId);
  return tier !== undefined && tier !== 'free';
}

/**
 * Get tier limits for a user
 */
export async function getUserTierLimits(userId: string): Promise<{
  tier: TierKey;
  siteLimit: number;
  smsLimit: number;
  checkInterval: number;
  hasApiAccess: boolean;
  hasWebhookAccess: boolean;
}> {
  const tier = await getUserEffectiveTier(userId);
  const tierConfig = TIERS[tier];

  return {
    tier,
    siteLimit: tierConfig.limit,
    smsLimit: tierConfig.smsLimit,
    checkInterval: tierConfig.checkInterval,
    hasApiAccess: tier === 'pro' || tier === 'business',
    hasWebhookAccess: tier === 'business',
  };
}

/**
 * Check if a user can add more websites
 */
export async function canUserAddWebsite(userId: string, currentCount: number): Promise<{
  allowed: boolean;
  limit: number;
  current: number;
  tier: TierKey;
}> {
  const tier = await getUserEffectiveTier(userId);
  const limit = TIERS[tier].limit;

  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount,
    tier,
  };
}

/**
 * Check if a user can send SMS alerts
 */
export async function canUserSendSMS(userId: string): Promise<boolean> {
  const tier = await getUserEffectiveTier(userId);
  
  if (tier === 'free') return false;
  
  const tierConfig = TIERS[tier];
  // All paid tiers have SMS limits > 0

  if (isSupabaseConfigured() && supabase) {
    const { data: user } = await supabase
      .from('users')
      .select('sms_count_monthly, sms_count_reset_at')
      .eq('id', userId)
      .single();

    if (!user) return false;

    const now = new Date();
    const resetDate = new Date(user.sms_count_reset_at || now);

    // Reset if it's a new month
    if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
      await supabase
        .from('users')
        .update({
          sms_count_monthly: 0,
          sms_count_reset_at: now.toISOString(),
        })
        .eq('id', userId);
      return true;
    }

    return user.sms_count_monthly < tierConfig.smsLimit;
  }

  // In-memory fallback - assume yes
  return true;
}

/**
 * Set user tier (for in-memory fallback during development)
 */
export function setUserTierById(userId: string, tier: TierKey): void {
  userTiers.set(userId, tier);
}

/**
 * Check if user has API access
 */
export async function hasApiAccess(userId: string): Promise<boolean> {
  const tier = await getUserEffectiveTier(userId);
  return tier === 'pro' || tier === 'business';
}

/**
 * Check if user has webhook access
 */
export async function hasWebhookAccess(userId: string): Promise<boolean> {
  const tier = await getUserEffectiveTier(userId);
  return tier === 'business';
}
