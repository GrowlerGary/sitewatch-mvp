# Stripe Setup Guide for SiteWatch

This guide walks you through setting up Stripe payments for SiteWatch's freemium model.

## Overview

SiteWatch uses Stripe for handling subscription payments. The freemium model includes:

- **Free Tier**: 1 website, all features
- **Pro Tier**: Up to 50 websites, $9/month (price adjustable), 14-day free trial

## Prerequisites

1. A Stripe account (free to create at [stripe.com](https://stripe.com))
2. Your SiteWatch app deployed to Vercel (or local development environment)

## Step 1: Create a Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and sign up
2. Complete the onboarding process
3. Switch to "Test mode" for development (toggle in top-right corner)

## Step 2: Create a Product and Price

1. In the Stripe Dashboard, go to **Products** → **Add product**
2. Enter product details:
   - **Name**: "SiteWatch Pro"
   - **Description**: "Monitor up to 50 websites with email alerts and SSL monitoring"
3. Under Pricing, select:
   - **Pricing model**: Standard pricing
   - **Price**: $9.00 (or your preferred price)
   - **Billing period**: Monthly
   - Check "Include a free trial period" → 14 days
4. Click **Save product**

## Step 3: Get Your API Keys

1. Go to **Developers** → **API keys**
2. Copy the **Secret key** (starts with `sk_test_` for test mode, `sk_live_` for live mode)
3. Note the **Publishable key** (starts with `pk_test_` or `pk_live_`) - this is used client-side but not needed for our setup

## Step 4: Get Your Price ID

1. Go to **Products** in the Dashboard
2. Click on your "SiteWatch Pro" product
3. Under the pricing section, click the price to expand it
4. Copy the **Price ID** (starts with `price_`)

## Step 5: Configure Environment Variables

Add these environment variables to your deployment:

### For Vercel Deployment:

```bash
vercel env add STRIPE_SECRET_KEY
# Enter your secret key when prompted

vercel env add STRIPE_PRICE_ID
# Enter your price ID when prompted

vercel env add STRIPE_WEBHOOK_SECRET
# Leave blank for now, we'll get this in Step 6
```

### For Local Development:

Create a `.env.local` file in your project root:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PRICE_ID=price_your_price_id_here
# STRIPE_WEBHOOK_SECRET=whsec_... (optional for local dev)
```

## Step 6: Set Up Webhooks (Optional but Recommended)

Webhooks allow Stripe to notify your app about subscription events (cancellations, failed payments, etc.).

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL:
   - Production: `https://your-domain.com/api/stripe/webhook`
   - Local testing: Use Stripe CLI (see below)
4. Select events to listen for:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.canceled`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it as `STRIPE_WEBHOOK_SECRET` environment variable

### Local Webhook Testing with Stripe CLI

1. Download and install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret and add to `.env.local`

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app in the browser

3. Try adding more than 1 website (free tier limit)

4. Click "Upgrade to Pro" in the upgrade modal

5. Use Stripe test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Any future expiry date, any 3-digit CVC, any ZIP

6. Complete the checkout flow

7. Verify your license is activated (check localStorage for `sitewatch_license_key`)

8. Try adding more websites (should now work)

## Step 8: Go Live

When you're ready to accept real payments:

1. In Stripe Dashboard, toggle off "Test mode"
2. Create a new product with live pricing (or copy your test product)
3. Get your live API keys (starts with `sk_live_`)
4. Update environment variables with live keys
5. Redeploy your application

## Troubleshooting

### "Stripe not configured" error
- Verify `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` are set correctly
- Restart your server after adding environment variables

### Checkout fails to load
- Check browser console for errors
- Verify the Price ID is correct and active
- Ensure you're using the correct API key (test vs live)

### License not activating after payment
- Check that webhooks are configured correctly
- Verify the success URL includes `?checkout=success&session_id={CHECKOUT_SESSION_ID}`
- Check server logs for any errors in `/api/license` route

### Site limit still enforced after upgrade
- Clear localStorage and refresh
- Re-enter license key manually
- Check browser console for validation errors

## API Routes

The following API routes handle payments:

- `POST /api/stripe/checkout` - Creates a Stripe Checkout session
- `POST /api/stripe/webhook` - Receives Stripe webhook events
- `POST /api/license` - Verifies checkout and returns license key
- `PUT /api/license` - Validates an existing license key

## License Key Format

License keys are generated in the format:
```
sw_{base64_customer_id}_{timestamp}
```

These keys are stored in localStorage and sent with API requests via the `X-License-Key` header.

## Security Considerations

- Never commit your Stripe secret key to git
- Use environment variables for all sensitive data
- The webhook endpoint validates Stripe signatures
- License keys are validated server-side on each request
- In production, consider persisting license data to a database instead of in-memory storage

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Support](https://support.stripe.com)

## Updating the Price

When Donut completes pricing research:

1. Update the price in Stripe Dashboard
2. Update `STRIPE_PRICE_ID` environment variable
3. The code uses the environment variable, so no code changes needed
4. Redeploy if the price ID changes
