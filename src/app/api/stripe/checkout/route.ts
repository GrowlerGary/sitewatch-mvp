import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { TIERS, TierKey } from '@/src/lib/tiers';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { successUrl, cancelUrl, tier } = body;

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Success and cancel URLs are required' },
        { status: 400 }
      );
    }

    if (!tier || !TIERS[tier as TierKey]) {
      return NextResponse.json(
        { error: 'Valid tier is required (starter or pro)' },
        { status: 400 }
      );
    }

    const tierConfig = TIERS[tier as TierKey];
    const priceId = tierConfig.priceId;

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { 
          error: 'Stripe not configured',
          message: 'Please set up your Stripe account and configure environment variables',
          setupInstructions: [
            '1. Create a Stripe account at https://stripe.com',
            '2. Create Products and Prices in the Stripe Dashboard',
            '3. Set STRIPE_SECRET_KEY environment variable',
            '4. Set STRIPE_STARTER_PRICE_ID and STRIPE_PRO_PRICE_ID environment variables',
          ]
        },
        { status: 503 }
      );
    }

    if (!priceId) {
      return NextResponse.json(
        { 
          error: 'Price not configured',
          message: `Price ID for tier "${tier}" is not set. Please configure STRIPE_${tier.toUpperCase()}_PRICE_ID environment variable.`,
        },
        { status: 503 }
      );
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tier,
      },
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          tier,
        },
      },
    });

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session', details: error.message },
      { status: 500 }
    );
  }
}
