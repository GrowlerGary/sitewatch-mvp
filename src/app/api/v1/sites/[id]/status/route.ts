import { NextResponse, NextRequest } from 'next/server';
import { withApiAuth } from '@/src/lib/api-auth';
import { getWebsiteById, getLogsForWebsite } from '@/src/lib/db';

// Calculate uptime percentage from logs
function calculateUptime(logs: { status: 'up' | 'down'; checkedAt: string }[]): number {
  if (logs.length === 0) return 100;
  
  const upCount = logs.filter(log => log.status === 'up').length;
  return Math.round((upCount / logs.length) * 100);
}

// GET /api/v1/sites/[id]/status - Get current status and uptime
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
      
      // Get all logs for uptime calculation
      const allLogs = await getLogsForWebsite(siteId);
      const uptimePercentage = calculateUptime(allLogs);
      
      // Get last 24 hours of logs (if timestamp is available)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogs = allLogs.filter(log => new Date(log.checkedAt) > oneDayAgo);
      
      // Calculate incidents (transitions from up to down)
      let incidents24h = 0;
      for (let i = 1; i < recentLogs.length; i++) {
        if (recentLogs[i].status === 'down' && recentLogs[i - 1].status === 'up') {
          incidents24h++;
        }
      }
      
      return NextResponse.json({
        site: {
          id: site.id,
          name: site.name,
          url: site.url,
          status: site.status,
          lastChecked: site.lastChecked,
          responseTime: site.responseTime,
        },
        uptime: {
          percentage: uptimePercentage,
          totalChecks: allLogs.length,
          upChecks: allLogs.filter(l => l.status === 'up').length,
          downChecks: allLogs.filter(l => l.status === 'down').length,
        },
        incidents: {
          last24Hours: incidents24h,
        },
        ssl: {
          expiryDate: site.sslExpiryDate,
          daysRemaining: site.sslDaysRemaining,
          status: site.sslDaysRemaining !== null 
            ? site.sslDaysRemaining <= 7 ? 'critical' 
            : site.sslDaysRemaining <= 14 ? 'warning' 
            : site.sslDaysRemaining <= 30 ? 'notice' 
            : 'good'
            : 'unknown',
        },
      });
    } catch (error) {
      console.error('API v1 site status error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }))(request);
}
