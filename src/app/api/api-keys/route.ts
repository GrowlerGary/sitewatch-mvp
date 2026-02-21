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
import { getUserById } from '@/src/lib/db';
import { TIERS, TierKey } from '@/src/lib/tiers';

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
    
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const tier = user.plan as TierKey;
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
    
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const tier = user.plan as TierKey;
    
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
    
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const tier = user.plan as TierKey;
    
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
