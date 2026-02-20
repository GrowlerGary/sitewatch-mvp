import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const PROTECTED_PATHS = ['/dashboard', '/settings', '/sites'];

// Paths that should redirect to dashboard if already authenticated
const AUTH_PATHS = ['/login', '/signup'];

// Security headers
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is protected
  const isProtectedPath = PROTECTED_PATHS.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  // Check if path is an auth path (login/signup)
  const isAuthPath = AUTH_PATHS.some(path => pathname === path);
  
  // Get user session from cookie
  const userCookie = request.cookies.get('sitewatch_user_id');
  const isAuthenticated = !!userCookie?.value;
  
  // Create response
  let response: NextResponse;
  
  // Redirect authenticated users away from auth pages
  if (isAuthPath && isAuthenticated) {
    response = NextResponse.redirect(new URL('/dashboard', request.url));
  }
  // Redirect unauthenticated users away from protected pages
  else if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    response = NextResponse.redirect(loginUrl);
  }
  else {
    response = NextResponse.next();
  }
  
  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Set secure cookie flags for existing cookies
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Ensure sitewatch_user_id cookie has secure flags if it exists
  if (userCookie?.value) {
    response.cookies.set('sitewatch_user_id', userCookie.value, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
  }
  
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/sites/:path*',
    '/login',
    '/signup',
  ],
};
