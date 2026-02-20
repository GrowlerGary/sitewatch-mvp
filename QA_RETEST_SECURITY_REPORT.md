# SiteWatch QA Re-Test Report + Security Assessment
**Date:** February 20, 2026  
**Tester:** Donut (QA Agent)  
**Status:** 🟡 PARTIAL - One Critical Fix + Security Issues Found

---

## Executive Summary

Carl has fixed **most** functional issues, but **one critical issue remains** and **multiple security vulnerabilities** were discovered that must be addressed before launch.

**CRITICAL SECURITY ISSUES FOUND:**
1. ❌ No CSRF protection on API endpoints
2. ❌ No rate limiting on authentication endpoints
3. ❌ XSS possible through website name fields
4. ❌ User ID enumeration possible
5. ❌ Missing security headers

**Recommendation:** Fix all security issues before launch. These are standard OWASP vulnerabilities that could compromise user data.

---

## PART 1: FUNCTIONAL TESTS

### 1. PRICING CONSISTENCY ✅ VERIFIED

| Tier | Landing Page | tiers.ts (Source) | Status |
|------|--------------|-------------------|--------|
| **Free** | $0/month, 1 website | $0, 1 site ✅ | Match |
| **Starter** | $5/month, 3 websites | $5, 3 sites ✅ | Match |
| **Pro** | $15/month, 10 websites | $15, 10 sites ✅ | Match |
| **Business** | $49/month, 50 websites | $49, 50 sites ✅ | Match |

**Result:** All pricing is now consistent across the application.

---

### 2. MONITORING FUNCTIONALITY ✅ VERIFIED

**Code Review of `src/lib/monitor.ts`:**

✅ `checkWebsite()` function properly:
- Makes HTTP GET requests
- Updates status, lastChecked, responseTime
- Sets SSL data (45 days for HTTPS sites)
- Saves logs and sends alerts

**Result:** Monitoring logic is correctly implemented.

---

### 3. UPGRADE MODAL SITE COUNT ⚠️ PARTIALLY FIXED

**Dashboard Page ✅ FIXED:** `currentSites={data.count}`

**Settings Page ❌ STILL BROKEN:**
- File: `src/app/settings/page.tsx` (line 276)
- Code: `currentSites={0}` (still hardcoded!)

---

### 4. FORM VALIDATION ✅ VERIFIED

All validation working correctly:
- ✅ Invalid email shows error
- ✅ Password < 8 chars rejected
- ✅ Password without uppercase/number rejected
- ✅ Mismatched passwords rejected
- ✅ Valid data allows signup

---

## PART 2: SECURITY ASSESSMENT 🔒

### 1. SQL INJECTION ✅ PROTECTED

**Status:** NOT VULNERABLE (In-memory storage used)

**Analysis:**
- Application uses in-memory Map storage (`src/lib/db.ts`)
- No SQL database in use
- No SQL queries being constructed
- Input validation present on all endpoints

**Test Cases:**
```
Input: ' OR '1'='1
Result: Treated as literal string, no injection possible

Input: '; DROP TABLE users; --
Result: Treated as literal string, no SQL execution
```

**Conclusion:** SQL Injection is **NOT possible** due to architecture (no SQL database).

---

### 2. CROSS-SITE SCRIPTING (XSS) ⚠️ PARTIALLY VULNERABLE

**Status:** VULNERABLE IN SOME AREAS

**Analysis:**

#### ✅ Protected Areas:
- React's JSX automatically escapes content by default
- No `dangerouslySetInnerHTML` usage found in codebase
- User input in forms is handled through controlled components

#### ❌ Vulnerable Areas:

**Website Names Display:**
```typescript
// File: src/app/dashboard/page.tsx (line 376)
<h3 className="text-lg font-semibold truncate">{website.name}</h3>

// File: src/app/sites/page.tsx (line 130)
<h3 className="font-semibold text-gray-900">{site.name}</h3>
```

**Attack Vector:**
```
1. User creates website with name: <img src=x onerror=alert('XSS')>
2. Name is displayed in dashboard without sanitization
3. Script executes in victim's browser
```

**Fix Required:**
```typescript
// Add sanitization utility
function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Use when displaying user input
<h3>{sanitizeInput(website.name)}</h3>
```

**Severity:** MEDIUM - Can steal session cookies, perform actions on behalf of user

---

### 3. CSRF PROTECTION ❌ MISSING

**Status:** CRITICAL VULNERABILITY

**Analysis:**

All API endpoints lack CSRF protection:
```typescript
// src/app/api/websites/route.ts
// src/app/api/user/route.ts
// src/app/api/check/route.ts
```

**No CSRF tokens present on:**
- Login form
- Signup form
- Add website form
- Delete website action
- Any API endpoint

**Attack Scenario:**
```html
<!-- Attacker's website -->
<form action="https://sitewatch.app/api/websites" method="POST" id="csrf">
  <input type="hidden" name="url" value="https://evil.com">
  <input type="hidden" name="name" value="Malicious Site">
</form>
<script>document.getElementById('csrf').submit();</script>
```

**Impact:** If user is logged in and visits attacker site, malicious website is added to their account.

**Fix Required:**
1. Add CSRF token generation on server
2. Include token in all forms
3. Validate token on all state-changing requests

```typescript
// Add to middleware.ts or API routes
const csrfToken = request.headers.get('X-CSRF-Token');
if (!validateCsrfToken(csrfToken, session)) {
  return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
}
```

**Severity:** HIGH - Can perform actions on behalf of authenticated users

---

### 4. AUTHENTICATION ISSUES ⚠️ PARTIALLY VULNERABLE

#### 4.1 Password Hashing ⚠️ WEAK

**Status:** USING UNSAFE HASHING

**Current Implementation:**
```typescript
// src/app/api/user/route.ts (lines 103-108)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'sitewatch-salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Problems:**
1. ❌ SHA-256 is designed for speed - vulnerable to brute force attacks
2. ❌ Single iteration (should be thousands)
3. ❌ Static salt (should be unique per user)
4. ❌ No password stretching (PBKDF2, bcrypt, or Argon2)

**Fix Required:**
```typescript
// Use bcrypt (install with: npm install bcrypt)
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Adjust based on performance needs
  return bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Severity:** HIGH - Passwords can be cracked quickly if database is compromised

---

#### 4.2 Session Management ⚠️ WEAK

**Status:** BASIC IMPLEMENTATION

**Current Implementation:**
```typescript
// Cookie set in login/signup pages
document.cookie = `sitewatch_user_id=${result.user.id}; path=/; max-age=2592000`; // 30 days
```

**Problems:**
1. ❌ No HttpOnly flag (JavaScript can access cookie)
2. ❌ No Secure flag (sent over HTTP)
3. ❌ No SameSite attribute
4. ❌ Simple user ID as session (predictable)
5. ❌ No session expiration/rotation
6. ❌ No invalidation mechanism

**Fix Required:**
```typescript
// Set cookie with security flags
document.cookie = `sitewatch_session=${sessionToken}; path=/; max-age=2592000; Secure; HttpOnly; SameSite=Strict`;
```

**Severity:** MEDIUM - Session hijacking possible via XSS

---

#### 4.3 Brute Force Protection ❌ MISSING

**Status:** NO PROTECTION

**No rate limiting on:**
- Login endpoint (`/api/user` PUT)
- Signup endpoint (`/api/user` POST)

**Attack Scenario:**
```
Attacker can make unlimited login attempts
→ Can brute force passwords
→ No account lockout
→ No IP-based blocking
```

**Fix Required:**
```typescript
// Add rate limiting middleware
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (attempts && attempts.count >= 5) {
    if (now - attempts.lastAttempt < 15 * 60 * 1000) { // 15 min lockout
      return false; // Blocked
    }
    loginAttempts.delete(identifier);
  }
  
  return true;
}
```

**Severity:** HIGH - Allows password brute forcing

---

#### 4.4 Protected Routes ✅ WORKING

**Status:** PROPERLY PROTECTED

**Middleware Implementation:**
```typescript
// src/middleware.ts
const PROTECTED_PATHS = ['/dashboard', '/settings', '/sites'];
// Checks for sitewatch_user_id cookie
// Redirects to login if not authenticated
```

**Result:** Unauthenticated users cannot access protected pages. ✓

---

### 5. SENSITIVE DATA EXPOSURE ⚠️ ISSUES FOUND

#### 5.1 API Response Leaks ⚠️ MEDIUM

**User API Exposes Internal Data:**
```typescript
// src/app/api/user/route.ts GET handler (lines 30-35)
return NextResponse.json({
  user: {
    ...user,  // ⚠️ Spreads entire user object
    siteCount: websites.length,
  },
});
```

**Problem:** If `passwordHash` or other sensitive fields are added to user object in future, they will be exposed.

**Fix Required:**
```typescript
return NextResponse.json({
  user: {
    id: user.id,
    email: user.email,
    plan: user.plan,
    siteCount: websites.length,
    // Explicitly exclude: passwordHash, stripeCustomerId, etc.
  },
});
```

---

#### 5.2 Error Messages ❌ LEAK INFORMATION

**Stack Traces in Error Responses:**
```typescript
// src/app/api/stripe/checkout/route.ts (line 77)
return NextResponse.json(
  { error: 'Failed to create checkout session', details: error.message },
  { status: 500 }
);
```

**Problem:** `error.message` can leak:
- Internal file paths
- Database connection strings
- API keys or tokens
- System architecture details

**Fix Required:**
```typescript
// Log detailed error internally
console.error('Detailed error:', error);

// Return generic message to client
return NextResponse.json(
  { error: 'An unexpected error occurred. Please try again later.' },
  { status: 500 }
);
```

**Severity:** MEDIUM - Information disclosure aids attackers

---

#### 5.3 URL Parameters ❌ SENSITIVE DATA

**Email in URL:**
```typescript
// src/app/login/page.tsx (line 44)
const userResponse = await fetch(`/api/user?email=${encodeURIComponent(email)}`);
```

**Problem:**
- Email addresses appear in server logs
- Email addresses appear in browser history
- Could be logged by proxies/CDNs

**Fix Required:** Use POST request with body instead of query parameter

---

### 6. ACCESS CONTROL ⚠️ ISSUES FOUND

#### 6.1 IDOR (Insecure Direct Object Reference) ⚠️ POTENTIAL

**Current Implementation:**
```typescript
// src/app/api/websites/[id]/route.ts
export async function DELETE(request: Request, { params }) {
  const { id } = await params;
  const userId = getUserId(request);  // From header
  const success = await deleteWebsite(id, userId);
  // ...
}
```

**Problem:** The `deleteWebsite` function searches ALL storages if not found in user's storage:
```typescript
// src/lib/db.ts (lines 79-88)
// Search all storages if not found in specified key
for (const [, storage] of inMemoryStorage.websites) {
  const index = storage.findIndex(site => site.id === id);
  if (index !== -1) {
    storage.splice(index, 1);
    return true;
  }
}
```

**Impact:** If user knows another website's ID, they might be able to delete it (depending on exact implementation).

**Fix Required:** Always verify ownership before any operation:
```typescript
const website = await getWebsiteById(id);
if (!website || website.userId !== userId) {
  return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
}
```

---

#### 6.2 User Enumeration ❌ POSSIBLE

**Different Error Messages:**
```typescript
// src/app/api/user/route.ts PUT handler (lines 115-125)
if (!user) {
  return NextResponse.json(
    { error: 'Invalid email or password' },  // Same message (good)
    { status: 401 }
  );
}
```

**However, timing attacks possible:**
- User exists: Hash computation performed
- User doesn't exist: Early return

**Fix:** Ensure consistent timing:
```typescript
const user = await getUserByEmail(email);
const dummyHash = '$2b$12$...'; // Pre-computed dummy hash
const hashToCheck = user?.passwordHash || dummyHash;
await verifyPassword(password, hashToCheck); // Always run
// Then check if user exists
```

---

## PART 3: SECURITY HEADERS CHECK ❌ MISSING

### Missing Security Headers:

| Header | Status | Purpose |
|--------|--------|---------|
| Content-Security-Policy | ❌ Missing | Prevents XSS, data injection |
| X-Frame-Options | ❌ Missing | Prevents clickjacking |
| X-Content-Type-Options | ❌ Missing | Prevents MIME sniffing |
| Strict-Transport-Security | ❌ Missing | Forces HTTPS |
| X-XSS-Protection | ❌ Missing | Legacy XSS protection |
| Referrer-Policy | ❌ Missing | Controls referrer info |

**Fix:** Add to `next.config.js`:
```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" },
        ],
      },
    ];
  },
};
```

---

## SUMMARY: SECURITY FINDINGS

### 🔴 CRITICAL (Must Fix Before Launch):

1. **CSRF Protection Missing** - Can perform actions on behalf of users
2. **Weak Password Hashing** - SHA-256 with static salt, vulnerable to brute force
3. **No Rate Limiting** - Can brute force passwords

### 🟠 HIGH (Should Fix Before Launch):

4. **XSS via Website Names** - No input sanitization on display
5. **Error Message Information Leak** - Stack traces exposed
6. **Weak Session Management** - No HttpOnly, Secure, or SameSite flags

### 🟡 MEDIUM (Fix Soon After Launch):

7. **Missing Security Headers** - CSP, HSTS, X-Frame-Options
8. **Potential IDOR** - deleteWebsite searches all storages
9. **Email in URL** - Appears in logs/history

### 🟢 LOW (Nice to Have):

10. **User Enumeration** - Timing attack possible
11. **API Response Exposure** - Overly broad object spread

---

## PART 4: FINAL RECOMMENDATIONS

### Before Launch (Critical):

1. **Add CSRF protection** to all state-changing endpoints
2. **Replace SHA-256 with bcrypt** for password hashing
3. **Implement rate limiting** on auth endpoints (5 attempts per 15 min)
4. **Sanitize all user input** before display (XSS protection)

### Before Launch (High Priority):

5. **Secure cookie flags** (HttpOnly, Secure, SameSite)
6. **Generic error messages** (no stack traces)
7. **Fix settings page site count** (functional issue)

### Post-Launch:

8. Add security headers (CSP, HSTS, etc.)
9. Implement proper audit logging
10. Add 2FA option
11. Regular security audits

---

## OVERALL ASSESSMENT

**Functional Issues:** 🟡 1 Critical Fix Still Needed (settings site count)

**Security Issues:** 🔴 Multiple Critical Vulnerabilities Found

**Launch Readiness:** ❌ **NOT READY** - Security issues must be addressed first

**Estimated Fix Time:** 1-2 days for critical security issues

---

**End of Report**
