import { RateLimiterMemory } from 'rate-limiter-flexible';

// Rate limiter for auth endpoints: 5 attempts per 15 minutes per IP
export const authRateLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: 5,
  duration: 15 * 60, // 15 minutes
});

// Rate limiter for general API: 100 requests per minute per IP
export const apiRateLimiter = new RateLimiterMemory({
  keyPrefix: 'api',
  points: 100,
  duration: 60, // 1 minute
});

// Get client IP from request
export function getClientIP(request: Request): string {
  // In production, use X-Forwarded-For header if behind a proxy
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return 'unknown';
}
