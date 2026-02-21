import { NextResponse } from 'next/server';

/**
 * DEPRECATED: License key validation via API
 * 
 * This route is deprecated and should not be used for new implementations.
 * Subscription validation is now handled server-side via the /api/user endpoint
 * which returns the user's subscription status from the database.
 * 
 * This file is kept for backward compatibility but will be removed in a future update.
 * 
 * Security Notice: Storing license keys client-side (localStorage) is a security
 * vulnerability as they can be stolen via XSS attacks. Always use server-side
 * validation with authenticated user sessions.
 */

export async function POST() {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use /api/user for subscription validation.',
      deprecated: true,
    },
    { status: 410 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { 
      error: 'This endpoint is deprecated. Please use /api/user for subscription validation.',
      deprecated: true,
    },
    { status: 410 }
  );
}
