# SiteWatch - Website Monitoring with Freemium Model

A modern website monitoring SaaS with email + SMS alerts, SSL monitoring, and tiered pricing.

## Features

- **Free Tier**: 1 website, 10-minute checks, email alerts
- **Starter ($5/mo)**: 3 websites, 5-minute checks, 10 SMS/month
- **Pro ($15/mo)**: 10 websites, 1-minute checks, API access, 50 SMS/month
- **Business ($49/mo)**: 50 websites, priority support, webhooks, 200 SMS/month

## Tech Stack

- Next.js 16 with App Router
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Stripe (Payments)
- Twilio (SMS)
- Resend (Email)
- Cron-Job.org (Scheduled checks)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/GrowlerGary/sitewatch-mvp.git
cd sitewatch-mvp
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 3. Set Up Supabase

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Run the schema SQL in `supabase/schema.sql`
4. Copy your project URL and service key to `.env.local`

### 4. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create three products with recurring pricing:
   - Starter: $5/month
   - Pro: $15/month  
   - Business: $49/month
3. Copy the price IDs to your `.env.local`
4. Set up webhook endpoint pointing to `/api/stripe/webhook`

### 5. Set Up Twilio (Optional, for SMS)

1. Create a Twilio account at [twilio.com](https://twilio.com)
2. Get a phone number for SMS
3. Copy credentials to `.env.local`

### 6. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Stripe Webhook Setup for Production

In Stripe Dashboard, create a webhook endpoint:
- URL: `https://your-domain.com/api/stripe/webhook`
- Events to listen for:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

## Database Schema

### Users Table
- `id`: UUID primary key
- `email`: User email
- `stripe_customer_id`: Stripe customer reference
- `plan`: free | starter | pro | business
- `phone_number`: For SMS alerts
- `sms_count_monthly`: Tracks SMS usage
- `sms_count_reset_at`: When to reset counter

### Subscriptions Table
- `id`: UUID primary key
- `user_id`: Reference to user
- `stripe_subscription_id`: Stripe subscription reference
- `status`: active | canceled | past_due | etc.
- `current_period_end`: When subscription renews
- `plan`: starter | pro | business

### Websites Table
- `id`: UUID primary key
- `user_id`: Reference to user
- `url`, `name`, `status`
- `last_checked`, `ssl_expiry_date`
- `response_time`, `last_error`

### Monitor Logs Table
- `id`: UUID primary key
- `website_id`: Reference to website
- `status`, `response_time`, `error`
- `checked_at`: Timestamp

## API Routes

- `GET/POST /api/websites` - List/create websites
- `GET/POST/PUT /api/user` - User management
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe events
- `GET /api/check` - Trigger monitoring check

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
