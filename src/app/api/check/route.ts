import { NextResponse } from 'next/server';
import { checkAllWebsites } from '@/src/lib/monitor';

export async function POST(request: Request) {
  try {
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
      { error: 'Failed to check websites', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: Request) {
  return POST(request);
}
