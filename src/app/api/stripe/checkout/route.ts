import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { TIERS, TierKey } from '@/src/lib/tiers';
import { supabase, isSupabaseConfigured } from '@/src/lib/db';

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
    const { successUrl, cancelUrl, tier, email, userId } = body;

    if (!successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Success and cancel URLs are required' },
        { status: 400 }
      );
    }

    if (!tier || !TIERS[tier as TierKey]) {
      return NextResponse.json(
        { error: 'Valid tier is required (starter, pro, or business)' },
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
            '4. Set STRIPE_STARTER_PRICE_ID, STRIPE_PRO_PRICE_ID, and STRIPE_BUSINESS_PRICE_ID environment variables',
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

    let customerId: string | undefined;

    // If userId is provided, try to get or create customer
    if (userId) {
      if (isSupabaseConfigured() && supabase) {
        // Get user from Supabase
        const { data: user } = await supabase
          .from('users')
          .select('stripe_customer_id, email')
          .eq('id', userId)
          .single();

        if (user?.stripe_customer_id) {
          customerId = user.stripe_customer_id;
        } else if (user) {
          // Create a new customer in Stripe
          const customer = await getStripe().customers.create({
            email: user.email,
            metadata: {
              userId: userId,
            },
          });
          customerId = customer.id;

          // Store customer ID in database
          await supabase
            .from('users')
            .update({
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }
      } else {
        // In-memory fallback - we don't store customer IDs in-memory
        // Just use email to create customer
        if (email) {
          const customers = await getStripe().customers.list({
            email: email,
            limit: 1,
          });
          
          if (customers.data.length > 0) {
            customerId = customers.data[0].id;
          } else {
            const customer = await getStripe().customers.create({
              email: email,
              metadata: {
                userId: userId || 'anonymous',
              },
            });
            customerId = customer.id;
          }
        }
      }
    }

    // Create checkout session
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
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
        userId: userId || '',
      },
      subscription_data: {
        trial_period_days: 14, // 14-day free trial
        metadata: {
          tier,
          userId: userId || '',
        },
      },
    };

    // Add customer if we have one
    if (customerId) {
      sessionConfig.customer = customerId;
    } else if (email) {
      sessionConfig.customer_email = email;
    }

    const session = await getStripe().checkout.sessions.create(sessionConfig);

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
