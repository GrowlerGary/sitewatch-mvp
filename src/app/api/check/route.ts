import { NextResponse } from 'next/server';
import { checkAllWebsites } from '@/src/lib/monitor';
import { apiRateLimiter, getClientIP } from '@/src/lib/rate-limiter';

// Generic error message helper
function getGenericErrorMessage(): string {
  return 'An error occurred while processing your request';
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

    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    // If CRON_SECRET is set, require valid token
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if license-specific check requested
    const licenseKey = request.headers.get('X-License-Key');
    
    console.log(`[SiteWatch API] Starting check - License: ${licenseKey || 'all'}`);
    
    const result = await checkAllWebsites(licenseKey);
    
    console.log(`[SiteWatch API] Check complete - ${result.checked} checked, ${result.errors} errors`);
    
    return NextResponse.json({ 
      success: true, 
      message: result.checked > 0 ? 'All websites checked' : 'No websites to check',
      checked: result.checked,
      errors: result.errors,
      licenseKey: licenseKey || 'all',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SiteWatch] Error checking websites:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage() },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: Request) {
  return POST(request);
}
