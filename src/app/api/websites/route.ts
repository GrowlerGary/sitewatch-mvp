import { NextResponse } from 'next/server';
import { getAllWebsites, addWebsite, canAddWebsite, deleteWebsite, getWebsiteById } from '@/src/lib/db';
import { TIERS, TierKey } from '@/src/lib/tiers';
import { getLicenseTier } from '../license/route';
import { sanitizeInput, sanitizeUrl } from '@/src/lib/sanitize';
import { apiRateLimiter, getClientIP } from '@/src/lib/rate-limiter';

// Helper to get user ID from request
function getUserId(request: Request): string | null {
  return request.headers.get('X-User-Id');
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
    const licenseKey = request.headers.get('X-License-Key');
    
    // Use userId as license key if available, otherwise use license key header
    const effectiveKey = userId || licenseKey;
    const tier: TierKey = getLicenseTier(effectiveKey) || 'free';
    
    const websites = await getAllWebsites(effectiveKey);
    
    // Sanitize website names for output
    const sanitizedWebsites = websites.map(site => ({
      ...site,
      name: sanitizeInput(site.name),
      url: sanitizeUrl(site.url) || site.url,
      lastError: site.lastError ? sanitizeInput(site.lastError) : null,
    }));
    
    return NextResponse.json({
      websites: sanitizedWebsites,
      tier,
      limit: TIERS[tier].limit,
      count: websites.length,
      features: TIERS[tier].features,
      checkInterval: TIERS[tier].checkInterval,
      usage: {
        sitesUsed: websites.length,
        sitesLimit: TIERS[tier].limit,
        smsUsed: 0,
        smsLimit: tier === 'free' ? 0 : tier === 'starter' ? 10 : tier === 'pro' ? 100 : 500,
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
    const licenseKey = request.headers.get('X-License-Key');
    const effectiveKey = userId || licenseKey;
    const tier: TierKey = getLicenseTier(effectiveKey) || 'free';
    
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
    const { allowed, limit, current } = await canAddWebsite(effectiveKey, tier);
    
    if (!allowed) {
      return NextResponse.json(
        { 
          error: 'Site limit reached',
          message: tier === 'free' 
            ? `Free tier limited to ${limit} websites. Upgrade to add more.`
            : `You've reached the maximum of ${limit} websites.`,
          tier,
          current,
          limit,
          upgradeRequired: tier === 'free',
          upgradeOptions: [
            { tier: 'starter', price: 5, limit: 10 },
            { tier: 'pro', price: 15, limit: 50 },
            { tier: 'business', price: 49, limit: Infinity },
          ],
        },
        { status: 403 }
      );
    }

    const website = await addWebsite({
      url,
      name,
      status: 'unknown',
      lastChecked: null,
      sslExpiryDate: null,
      sslDaysRemaining: null,
      responseTime: null,
      lastError: null,
    }, effectiveKey);

    return NextResponse.json({
      website: {
        ...website,
        name: sanitizeInput(website.name),
      },
      tier,
      count: current + 1,
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
