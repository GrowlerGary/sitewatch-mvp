// Pricing tiers based on Donut's research
// Free: 3 sites, 5-min checks
// Starter: 15 sites, 1-min checks, $9/mo
// Pro: 50 sites, 30-sec checks, $29/mo

export const TIERS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: null,
    limit: 3,
    checkInterval: 5, // minutes
    features: ['Email alerts', 'SSL monitoring', 'Basic dashboard'],
    popular: false,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 9,
    priceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    limit: 15,
    checkInterval: 1, // minute
    features: ['Email + SMS alerts', 'SSL monitoring', 'Advanced dashboard', '1-minute checks'],
    popular: false,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID || null,
    limit: 50,
    checkInterval: 0.5, // 30 seconds
    features: ['Email + SMS alerts', 'SSL monitoring', 'Advanced dashboard', '30-second checks', 'Team seats'],
    popular: true,
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
};

// Constants for backward compatibility
export const FREE_TIER_LIMIT = TIERS.free.limit;
export const PAID_TIER_LIMIT = TIERS.pro.limit;
export const STARTER_TIER_LIMIT = TIERS.starter.limit;
export const PRO_TIER_LIMIT = TIERS.pro.limit;
