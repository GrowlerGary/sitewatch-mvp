import { NextResponse, NextRequest } from 'next/server';
import { withApiAuth } from '@/src/lib/api-auth';
import { getWebsiteById, getLogsForWebsite } from '@/src/lib/db';

// GET /api/v1/sites/[id] - Get specific site details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  return (withApiAuth(async (req) => {
    try {
      const userId = req.userId!;
      const { id: siteId } = await params;
      
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
  }))(request);
}
