# SiteWatch Freemium Implementation Summary

## What Was Implemented

### 1. Payment Integration (Stripe)
- **Checkout API** (`/api/stripe/checkout`): Creates Stripe Checkout sessions for subscriptions
- **Webhook Handler** (`/api/stripe/webhook`): Handles Stripe events (payments, subscription changes)
- **License API** (`/api/license`): Verifies purchases and manages license keys

### 2. Pricing Tiers (Configured in `src/lib/tiers.ts`)
| Tier | Price | Sites | Check Interval | Features |
|------|-------|-------|----------------|----------|
| Free | $0 | 3 | 5 minutes | Email alerts, SSL monitoring, Basic dashboard |
| Starter | $9/mo | 15 | 1 minute | Email + SMS alerts, SSL monitoring, Advanced dashboard |
| Pro | $29/mo | 50 | 30 seconds | All Starter features + Team seats |

### 3. Site Limit Enforcement
- Free tier: **3 websites**
- Paid tiers: **15-50 websites** based on plan
- Enforced in `/api/websites` route
- Returns 403 with `upgradeRequired: true` when limit reached

### 4. License Key System
- License format: `sw_{tier}_{base64_customer_id}_{timestamp}`
- Stored in browser localStorage
- Sent with API requests via `X-License-Key` header
- Validated server-side on each request

### 5. UI Components
- **TierBadge**: Shows current tier in header
- **UpgradeModal**: Shown when user hits free tier limit
- **PricingPage**: Full pricing page with plan comparison
- **UsageStats**: Shows usage stats and upgrade button in sidebar

### 6. Environment Variables Required
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...(optional)
```

## Files Created/Modified

### New Files:
- `src/app/api/stripe/checkout/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/api/license/route.ts`
- `src/app/checkout/success/page.tsx`
- `src/app/success/page.tsx`
- `src/app/pricing/page.tsx`
- `src/components/PricingPage.tsx`
- `src/components/UpgradeModal.tsx`
- `src/components/TierBadge.tsx`
- `src/components/UsageStats.tsx`
- `src/lib/tiers.ts`
- `.env.example`
- `STRIPE_SETUP.md`

### Modified Files:
- `src/app/page.tsx` - Added license handling, upgrade modal integration
- `src/app/api/websites/route.ts` - Added license validation and site limits
- `src/app/api/websites/[id]/route.ts` - Added license header support
- `src/app/api/check/route.ts` - Added license-based checking
- `src/lib/monitor.ts` - Updated to work with async DB functions
- `package.json` - Added stripe dependency

## Setup Instructions

1. **Create Stripe Account**: https://stripe.com
2. **Create Products & Prices** in Stripe Dashboard:
   - Starter: $9/month
   - Pro: $29/month
3. **Get API Keys** from Stripe Dashboard
4. **Set Environment Variables** (see `.env.example`)
5. **Deploy and Test**

## Testing

Use Stripe test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date, any 3-digit CVC, any ZIP

## Notes

- **14-day free trial** included on all paid plans
- License keys are cached in memory (resets on serverless cold start - in production, use a database)
- The implementation uses dynamic imports for Stripe to avoid build-time errors
- All price points are placeholders - update in Stripe Dashboard and `tiers.ts` as needed
