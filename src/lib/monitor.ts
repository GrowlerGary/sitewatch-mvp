import { Website, MonitorLog } from './types';
import { updateWebsite, addMonitorLog, getAllWebsites as getLicensedWebsites, getUserById } from './db';
import { sendAlertEmail } from './email';
import { sendSiteDownWebhook, sendSiteUpWebhook, checkAndSendSSLWarnings, handleStatusChange } from './webhooks';

interface CheckResult {
  status: 'up' | 'down';
  responseTime: number | null;
  error: string | null;
  sslExpiryDate: string | null;
  sslDaysRemaining: number | null;
}

// Store all websites from all licenses for monitoring
let allWebsites: Map<string, Website> = new Map();
let websiteLicenseMap: Map<string, string | null> = new Map(); // websiteId -> licenseKey

export function registerWebsite(website: Website, licenseKey: string | null) {
  allWebsites.set(website.id, website);
  websiteLicenseMap.set(website.id, licenseKey);
}

export async function checkWebsite(website: Website): Promise<CheckResult> {
  const startTime = Date.now();
  const previousStatus = website.status;
  const licenseKey = websiteLicenseMap.get(website.id) || null;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(website.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SiteWatch/1.0 Monitoring Bot',
      },
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Site is up if status code is 2xx or 3xx
    const isUp = response.status >= 200 && response.status < 400;
    
    // Check SSL info from response headers (if available)
    let sslExpiryDate: string | null = null;
    let sslDaysRemaining: number | null = null;
    
    // Note: In a real implementation, we'd check SSL certificate details
    // For MVP, we'll simulate based on the URL being HTTPS
    if (website.url.startsWith('https://')) {
      // Simulate SSL check - in production, use proper SSL inspection
      sslDaysRemaining = 45; // Placeholder
    }
    
    const result: CheckResult = {
      status: isUp ? 'up' : 'down',
      responseTime,
      error: isUp ? null : `HTTP ${response.status}`,
      sslExpiryDate,
      sslDaysRemaining,
    };

    // Update website status
    await updateWebsite(website.id, {
      status: result.status,
      lastChecked: new Date().toISOString(),
      responseTime: result.responseTime,
      sslExpiryDate: result.sslExpiryDate,
      sslDaysRemaining: result.sslDaysRemaining,
      lastError: result.error,
    }, licenseKey);

    // Log the check
    await addMonitorLog({
      websiteId: website.id,
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
      sslDaysRemaining: result.sslDaysRemaining,
      checkedAt: new Date().toISOString(),
    });

    // Get user ID for webhook notifications (use license key as user ID for simplicity)
    const userId = licenseKey || website.userId || 'default';

    // Send alerts on status change
    if (previousStatus === 'up' && result.status === 'down') {
      // Site went down
      await sendAlertEmail(
        website,
        'down',
        `Your website ${website.name} (${website.url}) is now DOWN. Error: ${result.error}`
      );
      // Send webhook notification
      await sendSiteDownWebhook(userId, website, result.error || 'Site is unreachable', result.responseTime);
    } else if (previousStatus === 'down' && result.status === 'up') {
      // Site recovered
      await sendAlertEmail(
        website,
        'up',
        `Your website ${website.name} (${website.url}) is back UP! Response time: ${result.responseTime}ms`
      );
      // Send webhook notification
      await sendSiteUpWebhook(userId, website, result.responseTime);
    }

    // Handle status change tracking for webhooks
    await handleStatusChange(userId, website, result.status, result.error || undefined, result.responseTime);

    // SSL warning (if less than 14 days remaining)
    if (result.sslDaysRemaining !== null && result.sslDaysRemaining < 14) {
      await sendAlertEmail(
        website,
        'ssl',
        `SSL certificate for ${website.name} expires in ${result.sslDaysRemaining} days.`
      );
    }

    // Check and send SSL expiry warnings via webhook
    await checkAndSendSSLWarnings(userId, website);

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateWebsite(website.id, {
      status: 'down',
      lastChecked: new Date().toISOString(),
      lastError: errorMessage,
    }, licenseKey);

    await addMonitorLog({
      websiteId: website.id,
      status: 'down',
      responseTime: null,
      error: errorMessage,
      sslDaysRemaining: null,
      checkedAt: new Date().toISOString(),
    });

    // Send alert if site just went down
    if (previousStatus === 'up') {
      await sendAlertEmail(
        website,
        'down',
        `Your website ${website.name} (${website.url}) is now DOWN. Error: ${errorMessage}`
      );
      
      // Send webhook notification
      const userId = licenseKey || website.userId || 'default';
      await sendSiteDownWebhook(userId, website, errorMessage, null);
      await handleStatusChange(userId, website, 'down', errorMessage, null);
    }

    return {
      status: 'down',
      responseTime: null,
      error: errorMessage,
      sslExpiryDate: null,
      sslDaysRemaining: null,
    };
  }
}

export async function checkAllWebsites(licenseKey?: string | null): Promise<{ checked: number; errors: number }> {
  let websites: Website[] = [];
  
  if (licenseKey !== undefined && licenseKey !== null) {
    // Check websites for specific license
    websites = await getLicensedWebsites(licenseKey);
  } else {
    // Check ALL websites from all tiers - read directly from database
    // Free tier (null license key)
    const freeWebsites = await getLicensedWebsites(null);
    websites = [...freeWebsites];
    
    // Also check any registered websites in memory (for backward compatibility)
    const registeredWebsites = Array.from(allWebsites.values());
    for (const site of registeredWebsites) {
      if (!websites.find(w => w.id === site.id)) {
        websites.push(site);
      }
    }
  }
  
  // Remove duplicates
  const uniqueWebsites = Array.from(new Map(websites.map(w => [w.id, w])).values());
  
  let checked = 0;
  let errors = 0;
  
  console.log(`[SiteWatch] Starting check of ${uniqueWebsites.length} websites at ${new Date().toISOString()}`);
  
  for (const website of uniqueWebsites) {
    try {
      await checkWebsite(website);
      checked++;
      // Small delay between checks to be nice to target servers
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      errors++;
      console.error(`[SiteWatch] Failed to check ${website.url}:`, error);
    }
  }
  
  console.log(`[SiteWatch] Completed check: ${checked} checked, ${errors} errors`);
  
  return { checked, errors };
}
