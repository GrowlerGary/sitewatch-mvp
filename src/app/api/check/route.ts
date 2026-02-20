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

    const result = await checkAllWebsites();
    
    return NextResponse.json({ 
      success: true, 
      message: 'All websites checked',
      checked: result.checked,
      errors: result.errors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[SiteWatch] Error checking websites:', error);
    return NextResponse.json(
      { error: 'Failed to check websites' },
      { status: 500 }
    );
  }
}

// Also support GET for easier testing
export async function GET(request: Request) {
  return POST(request);
}
