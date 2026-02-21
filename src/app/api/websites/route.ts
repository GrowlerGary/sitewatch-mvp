import { NextResponse } from 'next/server';
import { TIERS, TierKey } from '@/src/lib/tiers';
import { supabase, isSupabaseConfigured } from '@/src/lib/db';
import { sanitizeInput, sanitizeUrl } from '@/src/lib/sanitize';
import { apiRateLimiter, getClientIP } from '@/src/lib/rate-limiter';

// Helper to get user ID from request
function getUserId(request: Request): string | null {
  return request.headers.get('X-User-Id');
}

// Get user's effective tier from database
async function getUserTier(userId: string): Promise<TierKey> {
  if (!userId) return 'free';

  if (isSupabaseConfigured() && supabase) {
    // Fetch user and subscription from Supabase
    const { data: user } = await supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .single();

    if (!user) return 'free';

    // Check for active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, plan')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subscription && ['active', 'trialing'].includes(subscription.status)) {
      return subscription.plan as TierKey;
    }

    return (user.plan as TierKey) || 'free';
  } else {
    // In-memory fallback
    const { getUser, getSubscriptionByUserId } = await import('@/src/lib/db');
    const user = await getUser(userId);
    if (!user) return 'free';

    const subscription = await getSubscriptionByUserId(userId);
    if (subscription && ['active', 'trialing'].includes(subscription.status)) {
      return subscription.plan;
    }

    return (user.plan as TierKey) || 'free';
  }
}

// Get website count for user
async function getWebsiteCount(userId: string): Promise<number> {
  if (isSupabaseConfigured() && supabase) {
    const { count } = await supabase
      .from('websites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    return count || 0;
  } else {
    const { getAllWebsites } = await import('@/src/lib/db');
    const websites = await getAllWebsites(userId);
    return websites.length;
  }
}

// Get all websites for user
async function getUserWebsites(userId: string) {
  if (isSupabaseConfigured() && supabase) {
    const { data } = await supabase
      .from('websites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return data || [];
  } else {
    const { getAllWebsites } = await import('@/src/lib/db');
    return await getAllWebsites(userId);
  }
}

// Generic error message helper
function getGenericErrorMessage(): string {
  return 'An error occurred while processing your request';
}

export async function GET(request: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    try {
      await apiRateLimiter.consume(clientIP);
    } catch {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const userId = getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const tier = await getUserTier(userId);
    const websites = await getUserWebsites(userId);
    const count = websites.length;
    
    // Sanitize website names for output
    const sanitizedWebsites = websites.map(site => ({
      ...site,
      name: sanitizeInput(site.name),
      url: sanitizeUrl(site.url) || site.url,
      lastError: site.last_error ? sanitizeInput(site.last_error) : null,
    }));
    
    return NextResponse.json({
      websites: sanitizedWebsites,
      tier,
      limit: TIERS[tier].limit,
      count,
      features: TIERS[tier].features,
      checkInterval: TIERS[tier].checkInterval,
      usage: {
        sitesUsed: count,
        sitesLimit: TIERS[tier].limit,
        smsUsed: 0,
        smsLimit: TIERS[tier].smsLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage() },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    try {
      await apiRateLimiter.consume(clientIP);
    } catch {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const userId = getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const tier = await getUserTier(userId);
    const currentCount = await getWebsiteCount(userId);
    const limit = TIERS[tier].limit;
    
    const body = await request.json();
    let { url, name } = body;

    if (!url || !name) {
      return NextResponse.json(
        { error: 'URL and name are required' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    name = sanitizeInput(name).trim();
    url = sanitizeUrl(url) || url.trim();

    if (!name) {
      return NextResponse.json(
        { error: 'Invalid name provided' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL' },
        { status: 400 }
      );
    }

    // Check site limits
    if (currentCount >= limit) {
      return NextResponse.json(
        { 
          error: 'Site limit reached',
          message: tier === 'free' 
            ? `Free tier limited to ${limit} websites. Upgrade to add more.`
            : `You've reached the maximum of ${limit} websites.`,
          tier,
          current: currentCount,
          limit,
          upgradeRequired: tier === 'free',
          upgradeOptions: [
            { tier: 'starter', price: 5, limit: 3 },
            { tier: 'pro', price: 15, limit: 10 },
            { tier: 'business', price: 49, limit: 50 },
          ],
        },
        { status: 403 }
      );
    }

    let website;
    
    if (isSupabaseConfigured() && supabase) {
      // Insert into Supabase
      const { data, error } = await supabase
        .from('websites')
        .insert({
          user_id: userId,
          url,
          name,
          status: 'unknown',
          last_checked: null,
          ssl_expiry_date: null,
          ssl_days_remaining: null,
          response_time: null,
          last_error: null,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating website:', error);
        return NextResponse.json(
          { error: 'Failed to create website' },
          { status: 500 }
        );
      }

      website = data;
    } else {
      // In-memory fallback
      const { addWebsite } = await import('@/src/lib/db');
      website = await addWebsite({
        url,
        name,
        status: 'unknown',
        lastChecked: null,
        sslExpiryDate: null,
        sslDaysRemaining: null,
        responseTime: null,
        lastError: null,
      }, userId);
    }

    return NextResponse.json({
      website: {
        ...website,
        name: sanitizeInput(website.name),
      },
      tier,
      count: currentCount + 1,
      limit,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding website:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage() },
      { status: 500 }
    );
  }
}
