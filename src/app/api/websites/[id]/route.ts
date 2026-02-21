import { NextResponse } from 'next/server';
import { deleteWebsite, getAllWebsites } from '@/src/lib/db';
import { sanitizeInput } from '@/src/lib/sanitize';
import { apiRateLimiter, getClientIP } from '@/src/lib/rate-limiter';

// Helper to get user ID from request
function getUserId(request: Request): string {
  return request.headers.get('X-User-Id') || request.headers.get('X-License-Key') || 'anonymous';
}

// Generic error message helper
function getGenericErrorMessage(): string {
  return 'An error occurred while processing your request';
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userId = getUserId(request);
    
    const success = await deleteWebsite(id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage() },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const userId = getUserId(request);
    
    const websites = await getAllWebsites(userId);
    const website = websites.find(w => w.id === id);

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Sanitize website data
    const sanitizedWebsite = {
      ...website,
      name: sanitizeInput(website.name),
      lastError: website.lastError ? sanitizeInput(website.lastError) : null,
    };

    return NextResponse.json(sanitizedWebsite);
  } catch (error) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: getGenericErrorMessage() },
      { status: 500 }
    );
  }
}
