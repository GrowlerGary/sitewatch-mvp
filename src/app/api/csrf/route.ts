import { NextResponse } from 'next/server';
import { generateCSRFToken } from '@/src/lib/csrf';

export async function GET(request: Request) {
  try {
    // Get or create session ID from cookie
    const cookieHeader = request.headers.get('cookie');
    let sessionId = cookieHeader?.match(/sessionId=([^;]+)/)?.[1];
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
    
    const csrfToken = generateCSRFToken(sessionId);
    
    const response = NextResponse.json({ csrfToken });
    
    // Set secure session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
