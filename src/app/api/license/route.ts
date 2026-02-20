import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// In-memory store for verified licenses (acts as a cache)
// In production, this should be backed by a database
interface LicenseInfo {
  status: 'active' | 'canceled' | 'past_due';
  customerId: string;
  subscriptionId: string;
  tier: 'starter' | 'pro';
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
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return NextResponse.json(
        { error: 'Payment not completed', status: session.payment_status },
        { status: 400 }
      );
    }

    const subscription = session.subscription as Stripe.Subscription;
    const tier = (session.metadata?.tier || 'starter') as 'starter' | 'pro';
    
    // Generate a license key
    const licenseKey = `sw_${tier}_${Buffer.from(session.customer as string).toString('base64url')}_${Date.now()}`;
    
    verifiedLicenses.set(licenseKey, {
      status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : subscription.status as any,
      customerId: session.customer as string,
      subscriptionId: subscription.id,
      tier,
    });

    return NextResponse.json({
      licenseKey,
      tier,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
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
      });
    }

    // If not in cache and Stripe is configured, verify with Stripe
    if (licenseKey.startsWith('sw_') && process.env.STRIPE_SECRET_KEY) {
      try {
        const parts = licenseKey.split('_');
        if (parts.length >= 3) {
          const tier = parts[1] as 'starter' | 'pro';
          const customerId = Buffer.from(parts[2], 'base64url').toString();
          
          // List subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1,
          });

          if (subscriptions.data.length > 0) {
            const sub = subscriptions.data[0];
            verifiedLicenses.set(licenseKey, {
              status: 'active',
              customerId,
              subscriptionId: sub.id,
              tier,
            });
            return NextResponse.json({
              valid: true,
              status: 'active',
              tier,
              currentPeriodEnd: sub.current_period_end,
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
    });
  } catch (error: any) {
    console.error('License validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate license' },
      { status: 500 }
    );
  }
}

// Export for use in other routes
export function isLicenseValid(licenseKey: string | null): boolean {
  if (!licenseKey) return false;
  const cached = verifiedLicenses.get(licenseKey);
  return cached?.status === 'active';
}

export function getLicenseTier(licenseKey: string | null): 'starter' | 'pro' | null {
  if (!licenseKey) return null;
  const cached = verifiedLicenses.get(licenseKey);
  return cached?.tier || null;
}
