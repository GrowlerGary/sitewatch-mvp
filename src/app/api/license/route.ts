import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { TierKey, TIERS } from '@/src/lib/tiers';
import { setUserTier } from '@/src/lib/db';

// Lazy initialize Stripe to avoid build-time errors
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return stripe;
}

// In-memory store for verified licenses
interface LicenseInfo {
  status: 'active' | 'canceled' | 'past_due';
  customerId: string;
  subscriptionId: string;
  tier: TierKey;
}

const verifiedLicenses: Map<string, LicenseInfo> = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }

    // Retrieve the checkout session
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      );
    }

    const subscription = session.subscription as Stripe.Subscription;
    const tier = (session.metadata?.tier || subscription.metadata?.tier || 'starter') as TierKey;
    
    // Generate a license key
    const licenseKey = `sw_${tier}_${Buffer.from(session.customer as string).toString('base64url')}_${Date.now()}`;
    
    const licenseInfo: LicenseInfo = {
      status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status as any,
      customerId: session.customer as string,
      subscriptionId: subscription.id,
      tier,
    };
    
    verifiedLicenses.set(licenseKey, licenseInfo);
    setUserTier(licenseKey, tier);

    return NextResponse.json({
      licenseKey,
      tier,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      features: TIERS[tier].features,
    });
  } catch (error: any) {
    console.error('License verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify license', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { licenseKey } = body;

    if (!licenseKey) {
      return NextResponse.json(
        { valid: false, error: 'License key is required' },
        { status: 400 }
      );
    }

    // Check local cache first
    const cached = verifiedLicenses.get(licenseKey);
    if (cached) {
      return NextResponse.json({
        valid: cached.status === 'active',
        status: cached.status,
        tier: cached.tier,
        features: TIERS[cached.tier].features,
      });
    }

    // If not in cache, verify with Stripe
    if (licenseKey.startsWith('sw_')) {
      try {
        const parts = licenseKey.split('_');
        if (parts.length >= 3) {
          const tier = parts[1] as TierKey;
          const customerId = Buffer.from(parts[2], 'base64url').toString();
          
          // List subscriptions for this customer
          const subscriptions = await getStripe().subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const sub = subscriptions.data[0];
            const licenseInfo: LicenseInfo = {
              status: 'active',
              customerId,
              subscriptionId: sub.id,
              tier,
            };
            verifiedLicenses.set(licenseKey, licenseInfo);
            setUserTier(licenseKey, tier);
            
            return NextResponse.json({
              valid: true,
              status: 'active',
              tier,
              currentPeriodEnd: sub.current_period_end,
              features: TIERS[tier].features,
            });
          }
        }
      } catch (e) {
        console.error('Error verifying with Stripe:', e);
      }
    }

    return NextResponse.json({
      valid: false,
      status: 'unknown',
      tier: 'free',
    });
  } catch (error: any) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate license' },
      { status: 500 }
    );
  }
}

// In-memory user tier storage (for users who upgrade)
const userTiers: Map<string, TierKey> = new Map();

export function setUserTierById(userId: string, tier: TierKey) {
  userTiers.set(userId, tier);
}

// Export for use in other routes
export function isLicenseValid(licenseKey: string | null): { valid: boolean; tier: TierKey } {
  if (!licenseKey) return { valid: false, tier: 'free' };
  const cached = verifiedLicenses.get(licenseKey);
  return { 
    valid: cached?.status === 'active', 
    tier: cached?.tier || 'free' 
  };
}

export function getLicenseTier(licenseKey: string | null): TierKey {
  if (!licenseKey) return 'free';
  
  // First check if it's a user ID with an upgraded tier
  const userTier = userTiers.get(licenseKey);
  if (userTier) return userTier;
  
  // Then check license cache
  const cached = verifiedLicenses.get(licenseKey);
  return cached?.tier || 'free';
}
