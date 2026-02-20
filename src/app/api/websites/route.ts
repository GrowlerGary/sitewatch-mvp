import { NextResponse } from 'next/server';
import { getAllWebsites, addWebsite } from '@/src/lib/db';

export async function GET() {
  const websites = getAllWebsites();
  return NextResponse.json(websites);
}

export async function POST(request: Request) {
  try {
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

    const website = addWebsite({
      url,
      name,
      status: 'unknown',
      lastChecked: null,
      sslExpiryDate: null,
      sslDaysRemaining: null,
      responseTime: null,
      lastError: null,
    });

    return NextResponse.json(website, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add website' },
      { status: 500 }
    );
  }
}
