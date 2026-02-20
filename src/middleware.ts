import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that require authentication
const PROTECTED_PATHS = ['/dashboard', '/settings', '/sites'];

// Paths that should redirect to dashboard if already authenticated
const AUTH_PATHS = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if path is protected
  const isProtectedPath = PROTECTED_PATHS.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );
  
  // Check if path is an auth path (login/signup)
  const isAuthPath = AUTH_PATHS.some(path => pathname === path);
  
  // Get user session from cookie (we'll use the userId stored in localStorage on client,
  // but for server-side protection, we'll use a simple cookie approach)
  const userCookie = request.cookies.get('sitewatch_user_id');
  const isAuthenticated = !!userCookie?.value;
  
  // Redirect authenticated users away from auth pages
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Redirect unauthenticated users away from protected pages
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
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
