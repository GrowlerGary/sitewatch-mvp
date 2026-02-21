import { NextResponse } from 'next/server';
import { 
  generateApiKey, 
  hashApiKey, 
  storeApiKey, 
  revokeApiKey, 
  getUserApiInfo,
  generateWebhookSecret,
  storeWebhookConfig,
} from '@/src/lib/api-auth';
import { supabase, isSupabaseConfigured } from '@/src/lib/db';
import { TIERS, TierKey } from '@/src/lib/tiers';

// Helper to get user's effective tier
async function getUserEffectiveTier(userId: string): Promise<TierKey> {
  if (isSupabaseConfigured() && supabase) {
    // Check for active subscription first
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

// GET /api/api-keys - Get user's API key status
export async function GET(request: Request) {
  try {
    // Get user ID from header (same pattern as other authenticated endpoints)
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const tier = await getUserEffectiveTier(userId);
    const hasApiAccess = tier === 'pro' || tier === 'business';
    const hasWebhookAccess = tier === 'business';
    
    const apiInfo = await getUserApiInfo(userId);
    
    return NextResponse.json({
      tier,
      hasApiAccess,
      hasWebhookAccess,
      apiKey: {
        exists: apiInfo?.hasApiKey || false,
        // Never return the actual key, just whether one exists
      },
      webhook: {
        url: apiInfo?.webhookUrl || null,
        configured: !!apiInfo?.webhookUrl,
      },
      limits: {
        rateLimit: 100, // requests per hour
        sites: TIERS[tier].limit,
      },
    });
  } catch (error) {
    console.error('API keys GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - Generate new API key
export async function POST(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const tier = await getUserEffectiveTier(userId);
    
    // Only Pro+ can generate API keys
    if (tier !== 'pro' && tier !== 'business') {
      return NextResponse.json(
        { 
          error: 'API access requires Pro or Business tier',
          upgradeRequired: true,
          currentTier: tier,
        },
        { status: 403 }
      );
    }
    
    // Generate new API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    
    // Store the hash (not the key itself)
    await storeApiKey(userId, apiKeyHash);
    
    return NextResponse.json({
      apiKey, // Only returned once on creation!
      message: 'Store this API key securely. It will not be shown again.',
    });
  } catch (error) {
    console.error('API keys POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys - Revoke API key
export async function DELETE(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    await revokeApiKey(userId);
    
    return NextResponse.json({
      message: 'API key revoked successfully',
    });
  } catch (error) {
    console.error('API keys DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/api-keys - Configure webhook (Business tier only)
export async function PATCH(request: Request) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const tier = await getUserEffectiveTier(userId);
    
    // Only Business tier can configure webhooks
    if (tier !== 'business') {
      return NextResponse.json(
        { 
          error: 'Webhooks require Business tier',
          upgradeRequired: true,
          currentTier: tier,
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { webhookUrl } = body;
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      );
    }
    
    // Generate webhook secret if not exists
    const existingInfo = await getUserApiInfo(userId);
    const webhookSecret = existingInfo?.webhookSecret || generateWebhookSecret();
    
    await storeWebhookConfig(userId, webhookUrl, webhookSecret);
    
    return NextResponse.json({
      webhookUrl,
      webhookSecret,
      message: 'Webhook configured successfully',
    });
  } catch (error) {
    console.error('API keys PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
