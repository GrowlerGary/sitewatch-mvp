// FINAL Pricing tiers - consistent across all files
// Free: 1 site, 10-min checks, email alerts
// Starter: $5/mo, 3 sites, 5-min checks, 10 SMS/mo
// Pro: $15/mo, 10 sites, 1-min checks, 50 SMS/mo
// Business: $49/mo, 50 sites, 1-min checks, 200 SMS/mo

export const TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    limit: 1,
    checkInterval: 10, // minutes
    smsLimit: 0,
    features: ['Email alerts', 'SSL monitoring', 'Basic dashboard'],
    popular: false,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 5,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    limit: 3,
    checkInterval: 5, // minutes
    smsLimit: 10,
    features: ['Email + SMS alerts', 'SSL monitoring', 'Advanced dashboard', '5-minute checks'],
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 15,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    limit: 10,
    checkInterval: 1, // minute
    smsLimit: 50,
    features: ['Email + SMS alerts', 'SSL monitoring', 'Advanced dashboard', '1-minute checks', 'API access'],
    popular: true,
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 49,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID || null,
    limit: 50,
    checkInterval: 1, // minute
    smsLimit: 200,
    features: ['Email + SMS alerts', 'SSL monitoring', 'Advanced dashboard', '1-minute checks', 'Priority support', 'Webhooks'],
    popular: false,
  },
} as const;

export type TierKey = keyof typeof TIERS;

// Helper functions
export function getTierById(id: string): typeof TIERS[TierKey] | null {
  return TIERS[id as TierKey] || null;
}

export function getTierPriceId(tier: TierKey): string | null {
  return TIERS[tier].priceId;
}

export function canAddSite(currentSiteCount: number, tier: TierKey): boolean {
  return currentSiteCount < TIERS[tier].limit;
}

// Stripe price IDs map for easy access
export const STRIPE_PRICE_IDS: Record<TierKey, string | null> = {
  free: null,
  starter: process.env.STRIPE_STARTER_PRICE_ID || null,
  pro: process.env.STRIPE_PRO_PRICE_ID || null,
  business: process.env.STRIPE_BUSINESS_PRICE_ID || null,
};

// Constants for backward compatibility
export const FREE_TIER_LIMIT = TIERS.free.limit;
export const STARTER_TIER_LIMIT = TIERS.starter.limit;
export const PRO_TIER_LIMIT = TIERS.pro.limit;
export const BUSINESS_TIER_LIMIT = TIERS.business.limit;
