import { NextResponse } from 'next/server';
import { checkAllWebsites } from '@/src/lib/monitor';

export async function POST(request: Request) {
  try {
    // Optional: Add secret token verification
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await checkAllWebsites();
    
    return NextResponse.json({ success: true, message: 'All websites checked' });
  } catch (error) {
    console.error('Error checking websites:', error);
    return NextResponse.json(
      { error: 'Failed to check websites' },
      { status: 500 }
    );
  }
}
