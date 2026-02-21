import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { getUserById, supabase, isSupabaseConfigured } from '@/src/lib/db';
import { TierKey, TIERS } from '@/src/lib/tiers';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { 
  generateApiKey as dbGenerateApiKey, 
  hashApiKey as dbHashApiKey, 
  generateWebhookSecret as dbGenerateWebhookSecret,
  getApiKeyByHash,
  updateLastUsed,
  signWebhookPayload,
  verifyWebhookSignature,
  getUserApiInfo as dbGetUserApiInfo,
  storeApiKey as dbStoreApiKey,
  revokeApiKey as dbRevokeApiKey,
  storeWebhookConfig as dbStoreWebhookConfig,
  getWebhookConfig as dbGetWebhookConfig,
} from '@/src/lib/api-keys';

// Rate limiter for API keys: 100 requests per hour per API key
const apiKeyRateLimiter = new RateLimiterMemory({
  keyPrefix: 'api_key',
  points: 100,
  duration: 60 * 60, // 1 hour
});

// Re-export functions from api-keys for convenience
export const generateApiKey = dbGenerateApiKey;
export const hashApiKey = dbHashApiKey;
export const generateWebhookSecret = dbGenerateWebhookSecret;

// Interface for authenticated API request
export interface AuthenticatedRequest extends NextRequest {
  apiKey?: string;
  userId?: string;
  userTier?: TierKey;
  user?: {
    id: string;
    email: string;
    plan: TierKey;
  };
}

// Extract API key from X-API-Key header
export function extractApiKey(request: Request): string | null {
  return request.headers.get('X-API-Key');
}

// Get user's effective tier from database
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

// Validate API key and return user info
export async function validateApiKey(
  apiKey: string
): Promise<{ valid: boolean; userId?: string; tier?: TierKey; error?: string }> {
  // Check if it's in the correct format
  if (!apiKey.startsWith('sw_live_')) {
    return { valid: false, error: 'Invalid API key format' };
  }
  
  // Hash the provided key
  const keyHash = dbHashApiKey(apiKey);
  
  // Look up the key in the database
  const keyRecord = await getApiKeyByHash(keyHash);
  
  if (!keyRecord) {
    return { valid: false, error: 'Invalid API key' };
  }
  
  // Get user's effective tier (checks subscription first)
  const tier = await getUserEffectiveTier(keyRecord.user_id);
  
  // Check if tier allows API access (Pro+ only)
  if (tier === 'free' || tier === 'starter') {
    return { 
      valid: false, 
      error: 'API access requires Pro or Business tier' 
    };
  }
  
  // Update last used timestamp (fire and forget)
  updateLastUsed(keyHash).catch(console.error);
  
  return {
    valid: true,
    userId: keyRecord.user_id,
    tier,
  };
}

// Store API key for a user (re-export with DB backing)
export async function storeApiKey(
  userId: string, 
  apiKeyHash: string
): Promise<void> {
  return dbStoreApiKey(userId, apiKeyHash);
}

// Get user's API key info (re-export with DB backing)
export async function getUserApiInfo(userId: string): Promise<{
  hasApiKey: boolean;
  apiKeyHash?: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
} | null> {
  return dbGetUserApiInfo(userId);
}

// Revoke API key (re-export with DB backing)
export async function revokeApiKey(userId: string): Promise<void> {
  return dbRevokeApiKey(userId);
}

// Store webhook configuration (re-export with DB backing)
export async function storeWebhookConfig(
  userId: string, 
  webhookUrl: string,
  webhookSecret: string
): Promise<void> {
  return dbStoreWebhookConfig(userId, webhookUrl, webhookSecret);
}

// Get webhook configuration for a user (re-export with DB backing)
export async function getWebhookConfig(userId: string): Promise<{
  url?: string;
  secret?: string;
} | null> {
  return dbGetWebhookConfig(userId);
}

// Middleware to validate API key and check tier
export function withApiAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const apiKey = extractApiKey(request);
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required. Include X-API-Key header.' },
        { status: 401 }
      );
    }
    
    // Validate API key
    const validation = await validateApiKey(apiKey);
    
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid API key' },
        { status: 401 }
      );
    }
    
    // Check tier for API access (Pro+ only)
    if (validation.tier === 'free' || validation.tier === 'starter') {
      return NextResponse.json(
        { error: 'API access requires Pro or Business tier' },
        { status: 403 }
      );
    }
    
    // Rate limiting
    try {
      await apiKeyRateLimiter.consume(apiKey);
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 100 requests per hour.' },
        { status: 429 }
      );
    }
    
    // Attach user info to request
    const authReq = request as AuthenticatedRequest;
    authReq.apiKey = apiKey;
    authReq.userId = validation.userId;
    authReq.userTier = validation.tier;
    
    return handler(authReq);
  };
}

// Send webhook payload with signature and retry logic
export async function sendWebhook(
  url: string,
  secret: string,
  payload: object,
  maxRetries: number = 3
): Promise<{ success: boolean; error?: string; responseStatus?: number }> {
  const payloadStr = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadStr, secret);
  
  let lastError: string | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'User-Agent': 'SiteWatch/1.0',
        },
        body: payloadStr,
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        return { success: true, responseStatus: response.status };
      }
      
      lastError = `HTTP ${response.status}: ${response.statusText}`;
      
      // Don't retry 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return { success: false, error: lastError, responseStatus: response.status };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Exponential backoff: 1s, 2s, 4s
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  return { success: false, error: lastError };
}

// Webhook event types
export type WebhookEventType = 
  | 'site.down'
  | 'site.up'
  | 'ssl.expiring_soon';

// Webhook payload structure
export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  site: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
  data: {
    previousStatus?: string;
    sslDaysRemaining?: number;
    error?: string;
    responseTime?: number | null;
  };
}

// Send webhook for a specific event
export async function sendWebhookEvent(
  userId: string,
  event: WebhookEventType,
  site: {
    id: string;
    name: string;
    url: string;
    status: string;
  },
  data: WebhookPayload['data']
): Promise<{ success: boolean; error?: string }> {
  const config = await dbGetWebhookConfig(userId);
  if (!config?.url || !config?.secret) {
    return { success: false, error: 'No webhook configured' };
  }
  
  // Check if user has Business tier
  const tier = await getUserEffectiveTier(userId);
  if (tier !== 'business') {
    return { success: false, error: 'Webhooks require Business tier' };
  }
  
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    site,
    data,
  };
  
  const result = await sendWebhook(config.url, config.secret, payload);
  
  // Log webhook delivery for debugging
  console.log(`[Webhook] ${event} for ${site.url}: ${result.success ? 'delivered' : 'failed'}${result.error ? ` (${result.error})` : ''}`);
  
  return result;
}
