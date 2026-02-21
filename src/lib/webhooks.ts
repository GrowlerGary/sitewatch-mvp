/**
 * Webhook delivery system for SiteWatch
 * Handles sending webhooks with retry logic and signature verification
 */

import { sendWebhookEvent, WebhookEventType } from '@/src/lib/api-auth';
import { Website } from '@/src/lib/types';

// Re-export types from api-auth for convenience
export type { WebhookEventType } from '@/src/lib/api-auth';

// Webhook event payloads
interface SiteDownPayload {
  previousStatus: string;
  error: string;
  responseTime: number | null;
}

interface SiteUpPayload {
  previousStatus: string;
  responseTime: number | null;
  downtimeDuration?: number; // in seconds
}

interface SSLExpiringPayload {
  sslDaysRemaining: number;
}

/**
 * Send webhook when a site goes down
 */
export async function sendSiteDownWebhook(
  userId: string,
  site: Website,
  error: string,
  responseTime: number | null
): Promise<void> {
  await sendWebhookEvent(
    userId,
    'site.down',
    {
      id: site.id,
      name: site.name,
      url: site.url,
      status: 'down',
    },
    {
      previousStatus: site.status,
      error,
      responseTime,
    }
  );
}

/**
 * Send webhook when a site comes back up
 */
export async function sendSiteUpWebhook(
  userId: string,
  site: Website,
  responseTime: number | null,
  downtimeDuration?: number
): Promise<void> {
  await sendWebhookEvent(
    userId,
    'site.up',
    {
      id: site.id,
      name: site.name,
      url: site.url,
      status: 'up',
    },
    {
      previousStatus: 'down',
      responseTime,
    }
  );
}

/**
 * Send webhook when SSL certificate is expiring soon
 */
export async function sendSSLExpiringWebhook(
  userId: string,
  site: Website,
  daysRemaining: number
): Promise<void> {
  await sendWebhookEvent(
    userId,
    'ssl.expiring_soon',
    {
      id: site.id,
      name: site.name,
      url: site.url,
      status: site.status,
    },
    {
      sslDaysRemaining: daysRemaining,
    }
  );
}

// Track which SSL warnings have been sent to avoid duplicates
const sslWarningSent = new Map<string, Set<number>>(); // siteId -> Set of days

/**
 * Check and send SSL expiry warnings (30, 14, 7 days)
 * Call this during monitoring checks
 */
export async function checkAndSendSSLWarnings(
  userId: string,
  site: Website
): Promise<void> {
  if (site.sslDaysRemaining === null) return;
  
  const warningDays = [30, 14, 7];
  const days = site.sslDaysRemaining;
  
  // Only warn at specific thresholds (within 1 day of threshold)
  for (const threshold of warningDays) {
    if (days <= threshold && days > threshold - 1) {
      // Check if we've already sent a warning for this threshold
      const sentForSite = sslWarningSent.get(site.id) || new Set();
      
      if (!sentForSite.has(threshold)) {
        await sendSSLExpiringWebhook(userId, site, days);
        sentForSite.add(threshold);
        sslWarningSent.set(site.id, sentForSite);
      }
    }
  }
  
  // Clean up old entries if SSL was renewed
  if (days > 30) {
    sslWarningSent.delete(site.id);
  }
}

/**
 * Track site status changes and trigger appropriate webhooks
 */
const lastStatus = new Map<string, string>(); // siteId -> last known status

export async function handleStatusChange(
  userId: string,
  site: Website,
  newStatus: 'up' | 'down',
  error?: string,
  responseTime?: number | null
): Promise<void> {
  const previousStatus = lastStatus.get(site.id) || site.status;
  
  // Site went down
  if (newStatus === 'down' && previousStatus !== 'down') {
    await sendSiteDownWebhook(userId, site, error || 'Site is unreachable', responseTime || null);
    lastStatus.set(site.id, 'down');
  }
  
  // Site came back up
  if (newStatus === 'up' && previousStatus === 'down') {
    await sendSiteUpWebhook(userId, site, responseTime || null);
    lastStatus.set(site.id, 'up');
  }
  
  // Initialize status tracking
  if (!lastStatus.has(site.id)) {
    lastStatus.set(site.id, newStatus);
  }
}

/**
 * Clear status tracking for a site (used when site is deleted)
 */
export function clearSiteTracking(siteId: string): void {
  lastStatus.delete(siteId);
  sslWarningSent.delete(siteId);
}
