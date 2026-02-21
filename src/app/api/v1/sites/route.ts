import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { withApiAuth, AuthenticatedRequest } from '@/src/lib/api-auth';
import { getAllWebsites, getWebsiteById, getLogsForWebsite } from '@/src/lib/db';
import { TIERS } from '@/src/lib/tiers';

// GET /api/v1/sites - List all monitored sites
async function getSitesHandler(request: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const userId = request.userId!;
    const userTier = request.userTier!;
    
    // Get user's sites - use license key equivalent
    const websites = await getAllWebsites(userId);
    
    return NextResponse.json({
      sites: websites.map(site => ({
        id: site.id,
        name: site.name,
        url: site.url,
        status: site.status,
        lastChecked: site.lastChecked,
        sslExpiryDate: site.sslExpiryDate,
        sslDaysRemaining: site.sslDaysRemaining,
        responseTime: site.responseTime,
        createdAt: site.createdAt,
      })),
      meta: {
        total: websites.length,
        tier: userTier,
        limit: TIERS[userTier].limit,
      },
    });
  } catch (error) {
    console.error('API v1 sites error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withApiAuth(getSitesHandler);
