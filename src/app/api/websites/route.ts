import { NextResponse } from 'next/server';
import { getAllWebsites, addWebsite, canAddWebsite } from '@/src/lib/db';
import { TIERS, TierKey } from '@/src/lib/tiers';
import { getLicenseTier } from '../license/route';

export async function GET(request: Request) {
  try {
    const licenseKey = request.headers.get('X-License-Key');
    const tier: TierKey = getLicenseTier(licenseKey) || 'free';
    
    const websites = await getAllWebsites(licenseKey);
    
    return NextResponse.json({
      websites,
      tier,
      limit: TIERS[tier].limit,
      count: websites.length,
      features: TIERS[tier].features,
      checkInterval: TIERS[tier].checkInterval,
    });
  } catch (error) {
    console.error('Error fetching websites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const licenseKey = request.headers.get('X-License-Key');
    const tier: TierKey = getLicenseTier(licenseKey) || 'free';
    
    const body = await request.json();
    const { url, name } = body;

    if (!url || !name) {
      return NextResponse.json(
        { error: 'URL and name are required' },
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
    const { allowed, limit, current } = await canAddWebsite(licenseKey, tier);
    
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
            { tier: 'starter', price: 9, limit: 15 },
            { tier: 'pro', price: 29, limit: 50 },
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
    }, licenseKey);

    return NextResponse.json({
      website,
      tier,
      count: current + 1,
      limit,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding website:', error);
    return NextResponse.json(
      { error: 'Failed to add website' },
      { status: 500 }
    );
  }
}
