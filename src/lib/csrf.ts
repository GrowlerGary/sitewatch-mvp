import crypto from 'crypto';

// In-memory CSRF token store (use Redis in production)
const csrfTokens = new Map<string, { token: string; expires: number }>();

// Generate a new CSRF token
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
  csrfTokens.set(sessionId, { token, expires });
  return token;
}

// Validate CSRF token
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  if (!stored) return false;
  if (stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  return stored.token === token;
}

// Get CSRF token for session
export function getCSRFToken(sessionId: string): string | null {
  const stored = csrfTokens.get(sessionId);
  if (!stored || stored.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return null;
  }
  return stored.token;
}

// Clear CSRF token
export function clearCSRFToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}
