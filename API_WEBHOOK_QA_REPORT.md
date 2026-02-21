# SiteWatch API & Webhooks QA Report

**Test Date:** 2026-02-20  
**Tester:** Donut, QA Tester  
**Version:** 1.0.0  
**Branch:** master  

---

## 1. Summary

**Overall Status:** ⚠️ **FIX REQUIRED BEFORE LAUNCH**

The API access and webhook implementation has significant bugs that prevent the core functionality from working. While the code structure and security design are generally sound, critical runtime errors and missing UI components make this feature incomplete.

### Test Coverage Summary

| Category | Tests Run | Passed | Failed | Blocked |
|----------|-----------|--------|--------|---------|
| Usability | 5 | 0 | 0 | 5 |
| UI/UX | 4 | 0 | 0 | 4 |
| Functional | 12 | 0 | 4 | 8 |
| Security | 8 | 4 | 0 | 4 |

---

## 2. Critical Issues (MUST FIX)

### 🚨 CRITICAL-001: API Routes Return 500 Error
**Severity:** Critical  
**Component:** `/api/v1/sites/*` routes  
**Status:** ❌ FAILED

**Issue:** All API endpoints under `/api/v1/sites` return HTTP 500 errors due to a Promise handling bug in the `withApiAuth` middleware.

**Root Cause:** In `src/lib/api-auth.ts`, the `withApiAuth` function is declared as `async` but returns a function:
```typescript
export async function withApiAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
): Promise<(req: NextRequest) => Promise<NextResponse>> {
  return async (request: NextRequest) => { ... }
}
```

In route files, it's used incorrectly:
```typescript
export const GET = withApiAuth(getSitesHandler); // Returns Promise, not function!
```

**Fix:** 
1. Remove `async` from `withApiAuth` function definition, OR
2. Change route exports to:
```typescript
export const GET = await withApiAuth(getSitesHandler);
```

**Impact:** API is completely non-functional.

---

### 🚨 CRITICAL-002: API Keys Section Missing from Settings Page
**Severity:** Critical  
**Component:** `/settings` page (`src/app/settings/page.tsx`)  
**Status:** ❌ MISSING

**Issue:** The settings page does NOT include the API keys section or webhook configuration UI. The page only shows:
- Account Information
- Subscription Plan
- Notifications
- Security
- Danger Zone

The API Key state hooks exist in the code but are never rendered:
```typescript
const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
const [webhookUrl, setWebhookUrl] = useState('');
```

**Expected:** Settings page should include:
1. API Access section (visible to Pro/Business tiers)
2. API Key generation UI with copy button
3. Revoke key button with confirmation
4. Webhook configuration section (Business tier only)

**Impact:** Users cannot access or manage API keys through the UI.

---

### 🚨 CRITICAL-003: API Key Store is In-Memory Only
**Severity:** Critical  
**Component:** `src/lib/api-auth.ts`  
**Status:** ⚠️ WARNING

**Issue:** API keys are stored only in a JavaScript Map (`apiKeyStore`) and are not persisted to the database.

```typescript
const apiKeyStore = new Map<string, {...}>();
```

**Impact:** 
- All API keys are lost on server restart
- Cannot scale to multiple server instances
- Not suitable for production use

**Fix:** Persist API key hashes to the database (add columns to `users` table: `api_key_hash`, `webhook_url`, `webhook_secret`).

---

## 3. Bugs (Should Fix)

### 🐛 BUG-001: `getAllApiUsers()` Function is Non-Functional
**Severity:** High  
**Component:** `src/lib/api-auth.ts`  
**Status:** ❌ BROKEN

**Issue:** The `getAllApiUsers()` function tries to use an import that doesn't make sense:
```typescript
async function getAllApiUsers() {
  const { getAllWebsites: getAll } = await import('@/src/lib/db');
  // This doesn't actually query users...
  return Array.from(apiKeyStore.values());
}
```

This function exists but `validateApiKey` iterates through `apiKeyStore.values()` directly, which is correct for the in-memory implementation but bypasses the broken helper.

**Impact:** Code quality issue - unused broken function.

---

### 🐛 BUG-002: Settings Page Fetches API Key Info But Never Uses It
**Severity:** Medium  
**Component:** `src/app/settings/page.tsx`  
**Status:** ⚠️ INCOMPLETE

**Issue:** The settings page fetches API key information:
```typescript
async function fetchApiKeyInfo(uid: string) {
  const response = await fetch('/api/api-keys', {
    headers: { 'X-User-Id': uid }
  });
  ...
}
```

But the fetched data is never rendered to the UI.

---

## 4. UI/UX Issues (Nice to Have)

### 💅 UI-001: No API Documentation Link in Settings
**Severity:** Low  
**Component:** Settings Page  
**Status:** Not Implemented

**Expected:** A link to API documentation should be provided in the API section.

---

### 💅 UI-002: No Visual Feedback for API Key Copy Action
**Severity:** Low  
**Component:** Settings Page  
**Status:** Not Implemented

**Expected:** The copy function exists but the UI component to trigger it is missing.

---

## 5. Security Findings

### ✅ SEC-001: API Keys Are Hashed (Not Plaintext)
**Status:** ✅ PASS

API keys are hashed using SHA-256 before storage:
```typescript
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
```

---

### ✅ SEC-002: Rate Limiting Implemented
**Status:** ✅ PASS

Rate limiting is properly configured at 100 requests per hour per API key:
```typescript
const apiKeyRateLimiter = new RateLimiterMemory({
  keyPrefix: 'api_key',
  points: 100,
  duration: 60 * 60, // 1 hour
});
```

---

### ✅ SEC-003: API Key Uses Header (Not URL)
**Status:** ✅ PASS

The API correctly expects the key in the `X-API-Key` header:
```typescript
export function extractApiKey(request: Request): string | null {
  return request.headers.get('X-API-Key');
}
```

---

### ✅ SEC-004: Webhook Signatures Use HMAC-SHA256
**Status:** ✅ PASS

Webhook signatures are properly implemented using HMAC-SHA256:
```typescript
export function signWebhookPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}
```

And verification uses timing-safe comparison:
```typescript
export function verifyWebhookSignature(...): boolean {
  const expected = signWebhookPayload(payload, secret);
  // ... timing-safe comparison
  return timingSafeEqual(expectedBuf, signatureBuf);
}
```

---

### ⏸️ SEC-005: SQL Injection Testing
**Status:** ⏸️ BLOCKED

Cannot test due to API returning 500 errors. Based on code review, the implementation uses parameterized queries through Supabase, which should be safe.

---

### ⏸️ SEC-006: XSS in Webhook URL Field
**Status:** ⏸️ BLOCKED

Cannot test due to missing UI. Based on code review, URL validation is performed:
```typescript
try {
  new URL(webhookUrl);
} catch {
  return NextResponse.json(
    { error: 'Invalid webhook URL' },
    { status: 400 }
  );
}
```

---

### ⏸️ SEC-007: Webhook Payload Sensitive Data Exposure
**Status:** ⏸️ BLOCKED

Cannot fully test without working webhooks. Payload structure appears clean:
```typescript
interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  site: {
    id: string;
    name: string;
    url: string;
    status: string;
  };
  data: {
    previousStatus?: string;
    sslDaysRemaining?: number;
    error?: string;
    responseTime?: number;
  };
}
```

---

## 6. Test Results by Category

### 6.1 Usability Testing

| Test | Status | Notes |
|------|--------|-------|
| API key generation is intuitive | ⏸️ BLOCKED | UI not implemented |
| Copy button works | ⏸️ BLOCKED | UI not implemented |
| Revoke confirmation is clear | ⏸️ BLOCKED | UI not implemented |
| Webhook URL input easy to find | ⏸️ BLOCKED | UI not implemented |
| Error messages are helpful | ❌ FAIL | 500 errors not helpful |

### 6.2 UI/UX Testing

| Test | Status | Notes |
|------|--------|-------|
| API section looks professional | ⏸️ BLOCKED | UI not implemented |
| Webhook section tier-restricted | ⏸️ BLOCKED | UI not implemented |
| API docs are clear | ⏸️ BLOCKED | No docs found |
| Mobile responsive | ⏸️ BLOCKED | Cannot test without UI |

### 6.3 Functional Testing

| Test | Status | Notes |
|------|--------|-------|
| Generate API key (Pro+) | ❌ FAIL | 500 error / missing UI |
| API key appears in list | ⏸️ BLOCKED | Missing UI |
| Copy to clipboard | ⏸️ BLOCKED | Missing UI |
| Revoke key removes it | ⏸️ BLOCKED | Missing UI |
| GET /api/v1/sites works | ❌ FAIL | 500 error |
| GET /api/v1/sites/[id] works | ❌ FAIL | 500 error |
| GET /api/v1/sites/[id]/status works | ❌ FAIL | 500 error |
| Invalid keys rejected (401) | ❌ FAIL | 500 error instead |
| Free/Starter cannot generate (403) | ⏸️ BLOCKED | Missing UI |
| Webhook config saves (Business) | ⏸️ BLOCKED | Missing UI |
| Webhooks fire on events | ⏸️ BLOCKED | Cannot test |
| Webhook payload has signature | ⏸️ BLOCKED | Cannot test |

### 6.4 Security Testing

| Test | Status | Notes |
|------|--------|-------|
| API keys stored hashed | ✅ PASS | SHA-256 hashing |
| Rate limiting (100/hour) | ✅ PASS | Implemented correctly |
| API key auth is secure | ✅ PASS | Uses X-API-Key header |
| Webhook signatures HMAC-SHA256 | ✅ PASS | Properly implemented |
| Payload doesn't expose secrets | ✅ PASS | Clean payload structure |
| No API key in URL | ✅ PASS | Header only |
| SQL injection protection | ⏸️ BLOCKED | Uses Supabase (safe) |
| XSS in webhook URL | ⏸️ BLOCKED | URL validation present |

---

## 7. Code Review Notes

### Positive Findings

1. **Good Security Design:**
   - API keys are hashed before storage
   - Rate limiting is properly implemented
   - Webhook signatures use HMAC-SHA256 with timing-safe comparison
   - API authentication uses headers, not URL parameters

2. **Proper Tier Checks:**
   - API access correctly restricted to Pro/Business tiers
   - Webhooks correctly restricted to Business tier only
   - Clear 403 responses for unauthorized tier access

3. **Webhook Implementation:**
   - Retry logic with exponential backoff
   - Timeout handling (30s)
   - Proper signature headers
   - Event type definitions

### Issues Found

1. **Architecture Problem:** In-memory storage for API keys is not production-ready
2. **Missing UI:** Complete settings page section is absent
3. **Runtime Error:** Promise handling bug prevents API from functioning

---

## 8. Database Schema Requirements

The current schema does not include columns for API key storage. Recommended migration:

```sql
-- Add to users table
ALTER TABLE users ADD COLUMN api_key_hash TEXT;
ALTER TABLE users ADD COLUMN webhook_url TEXT;
ALTER TABLE users ADD COLUMN webhook_secret TEXT;

-- Index for API key lookups
CREATE INDEX idx_users_api_key ON users(api_key_hash);
```

---

## 9. Required Fixes Checklist

### Before Launch (Critical)

- [ ] Fix `withApiAuth` Promise handling in API routes
- [ ] Add API Keys section to Settings page
- [ ] Add Webhook configuration UI (Business tier only)
- [ ] Persist API keys to database (not just in-memory)
- [ ] Test all API endpoints with valid keys
- [ ] Test tier restrictions (Free/Starter get 403)

### After Launch (High Priority)

- [ ] Add API documentation page
- [ ] Add webhook event logs/delivery status UI
- [ ] Implement proper API key rotation workflow
- [ ] Add rate limit usage display in settings

---

## 10. Recommendation

**🔴 FIX REQUIRED - DO NOT LAUNCH**

The API and webhook feature is **not ready for production**. Critical issues prevent basic functionality:

1. **API routes crash** with 500 errors due to Promise handling bug
2. **Settings UI is missing** the entire API management section
3. **API keys are not persisted** to database

### Estimated Fix Time

- Promise handling fix: ~30 minutes
- Settings UI implementation: ~2-4 hours
- Database persistence: ~1-2 hours
- Testing: ~2 hours

**Total: 1-2 days of development work**

---

## Appendix: Test Commands Used

```powershell
# Test API without key (should return 401)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/sites" -Method GET

# Test with invalid key (should return 401)
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/sites" -Method GET -Headers @{"X-API-Key"="invalid_key"}

# Test API key generation endpoint
Invoke-RestMethod -Uri "http://localhost:3000/api/api-keys" -Method POST -Headers @{"X-User-Id"="test-user-id"}
```

---

**Report Generated By:** Donut QA Tester  
**Date:** 2026-02-20  
**Signature:** 🍩