# SiteWatch QA Report
**Date:** February 20, 2026
**Tester:** Donut (QA Agent)
**Status:** 🟡 Issues Found - Needs Fixes Before Launch

---

## 1. Summary

SiteWatch MVP is functional for basic user flows but has **critical inconsistencies** between pricing tiers shown on different pages, and the monitoring functionality is not working properly. The authentication flow works well, site limit enforcement is correct, but several areas need attention before launch.

**Overall Status:** Needs fixes before launch

---

## 2. Critical Issues (Must Fix Before Launch) 🚨

### 2.1 Pricing/Tier Inconsistencies
**Severity:** Critical

There are **3 different pricing models** in the app:

| Tier | Landing Page | Upgrade Modal | Code (tiers.ts) | README |
|------|--------------|---------------|-----------------|--------|
| **Free** | 3 sites, 5min | - | 3 sites, 5min | 1 site, 10min |
| **Starter** | $5/mo, 10 sites, 3min | $9/mo, 15 sites, 1min | $9/mo, 15 sites, 1min | $5/mo, 3 sites, 5min |
| **Pro** | $15/mo, 50 sites, 1min | $29/mo, 50 sites, 30s | $29/mo, 50 sites, 30s | $15/mo, 10 sites, 1min |
| **Business** | $49/mo, unlimited, 30s | Not shown | Not in code | $49/mo, 50 sites |

**Action Required:**
- Decide on ONE pricing model
- Update ALL locations:
  - `src/lib/tiers.ts`
  - `src/app/page.tsx` (landing page)
  - `src/app/api/websites/route.ts` (error messages)
  - `README.md`

### 2.2 Website Monitoring Not Working
**Severity:** Critical

The `/api/check` endpoint returns success message but:
- Sites still show status "Unknown"
- "Last Checked" remains "Never"
- Response time shows "N/A"
- SSL shows "N/A"

**Action Required:**
- Debug the `checkAllWebsites` function in `src/lib/monitor.ts`
- Verify SSL certificate fetching logic
- Check that results are being saved to database

### 2.3 Upgrade Modal Shows Wrong Site Count
**Severity:** High

The upgrade modal says: "You're currently monitoring **0** websites" when I have 3 sites.

**Location:** `src/components/UpgradeModal.tsx` line 17 - `currentSites` prop is hardcoded to 0 in settings page

**Action Required:**
- In `src/app/settings/page.tsx`, pass actual site count to UpgradeModal

---

## 3. Bugs (Functionality Broken) 🐛

### 3.1 Signup Form Missing Validation
**Severity:** Medium
- Can submit signup form with empty email
- No error message shown
- Should validate email format before submission

### 3.2 Website Deletion Confirmation
**Severity:** Medium
- Native `confirm()` dialog appears but deleting doesn't work properly
- May be browser automation limitation
- Consider replacing with custom modal for better UX

### 3.3 Missing Phone Number Input for SMS
**Severity:** Medium
- Settings page shows "SMS Alerts" option but no phone number input field
- Cannot configure SMS alerts without phone number

### 3.4 Settings Page - Notification Toggles Not Functional
**Severity:** Low
- Toggle switches shown but are static (no actual functionality)
- No API endpoint to save notification preferences

### 3.5 Stripe Not Configured Error
**Severity:** Medium
- Shows "Stripe not configured" message when trying to upgrade
- Need proper environment variables or better error handling

---

## 4. UI/UX Issues (Design Improvements) ⚠️

### 4.1 Inconsistent "Upgrade" Button Placement
- Dashboard sidebar shows "Upgrade" button
- Sites page sidebar does NOT show "Upgrade" button (missing)

### 4.2 Missing Footer Links
- Footer links all go to "#" (not implemented):
  - Status Page
  - About, Blog, Careers
  - Documentation, API Reference, Support
  - Privacy, Terms, Security

### 4.3 Hero Section Badge Inconsistent
- Shows "Free for up to 3 websites" but actual free tier is 3 sites (for now)
- Should match final pricing decision

### 4.4 Empty States
- ✅ Empty state for "No websites" is good
- Need empty states for other scenarios (no alerts, etc.)

### 4.5 Settings Page Layout
- Check interval displayed as "5min" in settings - should be "5 min" for readability
- Tier badge in sidebar could be more prominent

---

## 5. What Works ✅

### 5.1 Landing Page
- ✅ Loads correctly
- ✅ All sections visible (Hero, Features, How It Works, Pricing)
- ✅ CTAs navigate correctly
- ✅ Mobile responsive design
- ✅ Professional appearance

### 5.2 Authentication Flow
- ✅ Signup works with email
- ✅ Login works
- ✅ Redirects to dashboard after login
- ✅ Stores user ID in localStorage

### 5.3 Dashboard
- ✅ Loads after login
- ✅ Shows user data correctly
- ✅ Sidebar navigation works
- ✅ Can add websites
- ✅ Site limit enforcement works (3 sites max on free)
- ✅ Upgrade modal appears when hitting limits
- ✅ Form disabled when at limit

### 5.4 Sites Page
- ✅ List displays correctly
- ✅ Shows all monitored sites
- ✅ Status indicators visible (though all "Unknown")
- ✅ Links to actual websites work

### 5.5 Settings Page
- ✅ User profile displays correctly
- ✅ Shows correct tier (Free)
- ✅ Subscription info visible
- ✅ Account deletion button exists (not tested fully)

### 5.6 Design & UX
- ✅ Color scheme consistent (blue primary)
- ✅ Typography readable
- ✅ Mobile responsive
- ✅ Loading states present
- ✅ Clean, professional design

---

## 6. Recommendations (Nice-to-Haves) 💡

### 6.1 Feature Additions
1. **Add phone number input** to settings for SMS
2. **Implement notification preferences** API
3. **Add password protection** (currently email-only)
4. **Add "Remember Me"** checkbox on login
5. **Add password reset** flow

### 6.2 Monitoring Improvements
1. **Real-time status updates** after check
2. **Manual check button** per website (not just global)
3. **Check history/logs** visible in UI
4. **SSL certificate details** (issuer, expiry date)

### 6.3 UI Improvements
1. **Toast notifications** instead of inline messages
2. **Better loading skeletons**
3. **Confirmation modals** instead of native `confirm()`
4. **Empty state illustrations** for all scenarios

### 6.4 Documentation
1. Update README with actual pricing
2. Add API documentation
3. Add webhook setup instructions

---

## 7. Test Results by Section

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | ✅ Pass | All working |
| Signup | ⚠️ Partial | Needs validation |
| Login | ✅ Pass | Works well |
| Dashboard | ⚠️ Partial | Monitoring not working |
| Add Website | ✅ Pass | Works correctly |
| Site Limit | ✅ Pass | Enforces 3 sites |
| Delete Website | ⚠️ Partial | Dialog issues |
| Sites List | ✅ Pass | Displays correctly |
| Settings | ⚠️ Partial | Missing SMS input |
| Upgrade Flow | ❌ Fail | Wrong prices, Stripe error |
| Check Now | ❌ Fail | Doesn't actually check |
| SSL Monitoring | ❌ Fail | Not updating |

---

## 8. Files That Need Changes

### Critical:
1. `src/lib/tiers.ts` - Fix pricing
2. `src/app/page.tsx` - Update pricing display
3. `src/lib/monitor.ts` - Fix monitoring logic
4. `src/components/UpgradeModal.tsx` - Fix site count display
5. `README.md` - Update to match final pricing

### High Priority:
6. `src/app/settings/page.tsx` - Add phone input, fix UpgradeModal props
7. `src/app/signup/page.tsx` - Add form validation
8. `src/app/api/stripe/checkout/route.ts` - Better error handling

### Medium Priority:
9. `src/app/sites/page.tsx` - Add Upgrade button to sidebar
10. Add proper footer pages

---

## 9. Action Items for Carl

### Before Launch (Critical):
1. **Decide on final pricing** - Document it clearly
2. **Update all pricing displays** to match
3. **Fix website monitoring** - The core feature must work
4. **Fix upgrade modal** site count

### Before Launch (High Priority):
5. Add form validation to signup
6. Add phone number input for SMS
7. Fix Stripe configuration or error handling

### Post-Launch:
8. Add proper footer pages
9. Implement notification preferences
10. Add password-based auth

---

## Screenshots

Screenshot files captured during testing:
1. `browser_968ad320-1bbe-442f-bd69-ad96dddaba3e.jpg` - Full landing page
2. `browser_13a2c469-d63e-4392-8874-1ead01decd09.png` - Sites page
3. `browser_c067499e-6b80-4f70-8cb1-0d8b27b7f385.png` - Settings page (full page)

---

**End of Report**
