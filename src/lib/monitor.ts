import { Website, MonitorLog } from './types';
import { updateWebsite, addMonitorLog } from './db';

interface CheckResult {
  status: 'up' | 'down';
  responseTime: number | null;
  error: string | null;
  sslExpiryDate: string | null;
  sslDaysRemaining: number | null;
}

export async function checkWebsite(website: Website): Promise<CheckResult> {
  const startTime = Date.now();
  
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
    });

    // Log the check
    await addMonitorLog({
      websiteId: website.id,
      status: result.status,
      responseTime: result.responseTime,
      error: result.error,
      sslDaysRemaining: result.sslDaysRemaining,
      checkedAt: new Date().toISOString(),
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateWebsite(website.id, {
      status: 'down',
      lastChecked: new Date().toISOString(),
      lastError: errorMessage,
    });

    await addMonitorLog({
      websiteId: website.id,
      status: 'down',
      responseTime: null,
      error: errorMessage,
      sslDaysRemaining: null,
      checkedAt: new Date().toISOString(),
    });

    return {
      status: 'down',
      responseTime: null,
      error: errorMessage,
      sslExpiryDate: null,
      sslDaysRemaining: null,
    };
  }
}

export async function checkAllWebsites(): Promise<void> {
  const { getAllWebsites } = await import('./db');
  const websites = getAllWebsites();
  
  for (const website of websites) {
    try {
      await checkWebsite(website);
      // Small delay between checks
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to check ${website.url}:`, error);
    }
  }
}
