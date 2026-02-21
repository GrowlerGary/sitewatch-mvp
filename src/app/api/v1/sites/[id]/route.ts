import { NextResponse } from 'next/server';
import { AuthenticatedRequest, withApiAuth } from '@/src/lib/api-auth';
import { getWebsiteById, getLogsForWebsite } from '@/src/lib/db';

// GET /api/v1/sites/[id] - Get specific site details
async function getSiteHandler(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const userId = request.userId!;
    const siteId = params.id;
    
    // Get the specific site
    const site = await getWebsiteById(siteId, userId);
    
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }
    
    // Get recent logs for this site
    const logs = await getLogsForWebsite(siteId);
    
    return NextResponse.json({
      site: {
        id: site.id,
        name: site.name,
        url: site.url,
        status: site.status,
        lastChecked: site.lastChecked,
        sslExpiryDate: site.sslExpiryDate,
        sslDaysRemaining: site.sslDaysRemaining,
        responseTime: site.responseTime,
        lastError: site.lastError,
        createdAt: site.createdAt,
      },
      recentLogs: logs.slice(-20).map(log => ({
        status: log.status,
        responseTime: log.responseTime,
        checkedAt: log.checkedAt,
        error: log.error,
        sslDaysRemaining: log.sslDaysRemaining,
      })),
    });
  } catch (error) {
    console.error('API v1 site detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  return (await withApiAuth(async (req) => getSiteHandler(req, { params })))(request);
}
