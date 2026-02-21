import { createHash, createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { supabase, isSupabaseConfigured } from './db';

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

// API Key database interface
export interface ApiKeyRecord {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
  webhook_url?: string | null;
  webhook_secret?: string | null;
}

// In-memory fallback for development
const inMemoryApiKeys = new Map<string, ApiKeyRecord[]>();

// Get all API keys for a user
export async function getUserApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) {
      console.error('Supabase error fetching API keys:', error);
      // Fall through to in-memory
    } else {
      return data || [];
    }
  }
  
  // In-memory fallback
  return inMemoryApiKeys.get(userId) || [];
}

// Get API key by hash
export async function getApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Supabase error fetching API key by hash:', error);
    } else {
      return data;
    }
  }
  
  // In-memory fallback
  for (const [userId, keys] of inMemoryApiKeys) {
    const key = keys.find(k => k.key_hash === keyHash && k.is_active);
    if (key) return key;
  }
  return null;
}

// Store new API key
export async function storeApiKey(
  userId: string, 
  keyHash: string,
  name: string = 'Default API Key'
): Promise<void> {
  const now = new Date().toISOString();
  
  const newKey: Omit<ApiKeyRecord, 'id'> = {
    user_id: userId,
    key_hash: keyHash,
    name,
    created_at: now,
    last_used_at: null,
    is_active: true,
  };
  
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('api_keys')
      .insert([newKey]);
    
    if (error) {
      console.error('Supabase error storing API key:', error);
      // Fall through to in-memory
    } else {
      return;
    }
  }
  
  // In-memory fallback
  const existingKeys = inMemoryApiKeys.get(userId) || [];
  // Deactivate any existing keys for this user
  existingKeys.forEach(k => k.is_active = false);
  // Add new key
  existingKeys.push({
    ...newKey,
    id: Math.random().toString(36).substring(2, 9),
  });
  inMemoryApiKeys.set(userId, existingKeys);
}

// Revoke all API keys for a user
export async function revokeApiKey(userId: string): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    if (error) {
      console.error('Supabase error revoking API key:', error);
    } else {
      return;
    }
  }
  
  // In-memory fallback
  const keys = inMemoryApiKeys.get(userId) || [];
  keys.forEach(k => k.is_active = false);
  inMemoryApiKeys.set(userId, keys);
}

// Update last used timestamp
export async function updateLastUsed(keyHash: string): Promise<void> {
  const now = new Date().toISOString();
  
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase
      .from('api_keys')
      .update({ last_used_at: now })
      .eq('key_hash', keyHash);
    
    if (error) {
      console.error('Supabase error updating last used:', error);
    } else {
      return;
    }
  }
  
  // In-memory fallback
  for (const [userId, keys] of inMemoryApiKeys) {
    const key = keys.find(k => k.key_hash === keyHash);
    if (key) {
      key.last_used_at = now;
      break;
    }
  }
}

// Get user's API key info (for settings page)
export async function getUserApiInfo(userId: string): Promise<{
  hasApiKey: boolean;
  apiKeyHash?: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
} | null> {
  const keys = await getUserApiKeys(userId);
  const activeKey = keys[0]; // Get the first active key
  
  if (!activeKey) return null;
  
  return {
    hasApiKey: true,
    apiKeyHash: activeKey.key_hash,
    webhookUrl: activeKey.webhook_url,
    webhookSecret: activeKey.webhook_secret,
  };
}

// Store webhook configuration
export async function storeWebhookConfig(
  userId: string, 
  webhookUrl: string,
  webhookSecret: string
): Promise<void> {
  if (isSupabaseConfigured() && supabase) {
    // Get the active key for this user
    const { data: keys, error: fetchError } = await supabase
      .from('api_keys')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('Supabase error fetching keys for webhook:', fetchError);
    } else if (keys && keys.length > 0) {
      // Update all active keys with webhook config
      const { error } = await supabase
        .from('api_keys')
        .update({ webhook_url: webhookUrl, webhook_secret: webhookSecret })
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) {
        console.error('Supabase error storing webhook config:', error);
      } else {
        return;
      }
    }
  }
  
  // In-memory fallback
  const keys = inMemoryApiKeys.get(userId) || [];
  keys.forEach(k => {
    k.webhook_url = webhookUrl;
    k.webhook_secret = webhookSecret;
  });
  if (keys.length === 0) {
    // Create a placeholder key entry for webhook-only config
    keys.push({
      id: Math.random().toString(36).substring(2, 9),
      user_id: userId,
      key_hash: '',
      name: 'Webhook Config',
      created_at: new Date().toISOString(),
      last_used_at: null,
      is_active: true,
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
    });
  }
  inMemoryApiKeys.set(userId, keys);
}

// Get webhook configuration for a user
export async function getWebhookConfig(userId: string): Promise<{
  url?: string;
  secret?: string;
} | null> {
  const keys = await getUserApiKeys(userId);
  const key = keys.find(k => k.webhook_url);
  
  if (!key || !key.webhook_url) return null;
  
  return {
    url: key.webhook_url,
    secret: key.webhook_secret || undefined,
  };
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
