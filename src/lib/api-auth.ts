import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { getUserById } from '@/src/lib/db';
import { TierKey, TIERS } from '@/src/lib/tiers';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter for API keys: 100 requests per hour per API key
const apiKeyRateLimiter = new RateLimiterMemory({
  keyPrefix: 'api_key',
  points: 100,
  duration: 60 * 60, // 1 hour
});

// API Key format: sw_live_<random>
export function generateApiKey(): string {
  const random = Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
  return `sw_live_${random}`;
}

// Hash API key for storage
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

// Generate a webhook secret for signature verification
export function generateWebhookSecret(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 36).toString(36)
  ).join('');
}

// Sign webhook payload with HMAC-SHA256
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

// Verify webhook signature using timing-safe comparison
export function verifyWebhookSignature(
  payload: string, 
  signature: string, 
  secret: string
): boolean {
  const expected = signWebhookPayload(payload, secret);
  const expectedBuf = Buffer.from(expected, 'hex');
  const signatureBuf = Buffer.from(signature, 'hex');
  
  if (expectedBuf.length !== signatureBuf.length) {
    return false;
  }
  
  return timingSafeEqual(expectedBuf, signatureBuf);
}

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

// In-memory API key store (userId -> { apiKeyHash, plan, etc })
const apiKeyStore = new Map<string, {
  id: string;
  email: string;
  plan: TierKey;
  apiKeyHash: string;
  webhookUrl?: string;
  webhookSecret?: string;
}>();

// Extract API key from X-API-Key header
export function extractApiKey(request: Request): string | null {
  return request.headers.get('X-API-Key');
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
  const keyHash = hashApiKey(apiKey);
  
  // Look up the key in our in-memory store
  for (const user of apiKeyStore.values()) {
    if (user.apiKeyHash === keyHash) {
      // Check if tier allows API access (Pro+ only)
      if (user.plan === 'free' || user.plan === 'starter') {
        return { 
          valid: false, 
          error: 'API access requires Pro or Business tier' 
        };
      }
      
      return {
        valid: true,
        userId: user.id,
        tier: user.plan,
      };
    }
  }
  
  return { valid: false, error: 'Invalid API key' };
}

// Store API key for a user
export async function storeApiKey(
  userId: string, 
  apiKeyHash: string
): Promise<void> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  
  apiKeyStore.set(userId, {
    id: userId,
    email: user.email,
    plan: user.plan as TierKey,
    apiKeyHash,
  });
}

// Get user's API key info
export async function getUserApiInfo(userId: string): Promise<{
  hasApiKey: boolean;
  apiKeyHash?: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
} | null> {
  const user = apiKeyStore.get(userId);
  if (!user) return null;
  
  return {
    hasApiKey: !!user.apiKeyHash,
    apiKeyHash: user.apiKeyHash,
    webhookUrl: user.webhookUrl || null,
    webhookSecret: user.webhookSecret || null,
  };
}

// Revoke API key
export async function revokeApiKey(userId: string): Promise<void> {
  const user = apiKeyStore.get(userId);
  if (user) {
    user.apiKeyHash = '';
    apiKeyStore.set(userId, user);
  }
}

// Store webhook configuration
export async function storeWebhookConfig(
  userId: string, 
  webhookUrl: string,
  webhookSecret: string
): Promise<void> {
  const user = apiKeyStore.get(userId);
  if (user) {
    user.webhookUrl = webhookUrl;
    user.webhookSecret = webhookSecret;
    apiKeyStore.set(userId, user);
  } else {
    // Create entry if it doesn't exist
    const dbUser = await getUserById(userId);
    if (!dbUser) throw new Error('User not found');
    
    apiKeyStore.set(userId, {
      id: userId,
      email: dbUser.email,
      plan: dbUser.plan as TierKey,
      apiKeyHash: '',
      webhookUrl,
      webhookSecret,
    });
  }
}

// Get webhook configuration for a user
export async function getWebhookConfig(userId: string): Promise<{
  url?: string;
  secret?: string;
} | null> {
  const user = apiKeyStore.get(userId);
  if (!user || !user.webhookUrl) return null;
  
  return {
    url: user.webhookUrl,
    secret: user.webhookSecret,
  };
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
  const config = await getWebhookConfig(userId);
  if (!config?.url || !config?.secret) {
    return { success: false, error: 'No webhook configured' };
  }
  
  // Check if user has Business tier
  const user = apiKeyStore.get(userId);
  if (!user || user.plan !== 'business') {
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
