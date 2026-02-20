# SiteWatch Deployment Checklist

## Pre-Deployment Verification

### ✅ Code Status
- [ ] All features implemented
- [ ] All QA issues resolved
- [ ] All security issues resolved
- [ ] Code committed to GitHub (`master` branch)
- [ ] Local build successful (`npm run build`)
- [ ] `npm audit` shows 0 vulnerabilities

---

## Environment Variables (Vercel)

### Database (Supabase)
- [ ] `SUPABASE_URL` - Your Supabase project URL
- [ ] `SUPABASE_ANON_KEY` - Supabase anonymous key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for server-side)

### Payments (Stripe)
- [ ] `STRIPE_PUBLISHABLE_KEY` - pk_live_... (or pk_test_... for testing)
- [ ] `STRIPE_SECRET_KEY` - sk_live_... (or sk_test_... for testing)
- [ ] `STRIPE_WEBHOOK_SECRET` - From Stripe CLI or dashboard

### SMS (Twilio)
- [ ] `TWILIO_ACCOUNT_SID` - AC_...
- [ ] `TWILIO_AUTH_TOKEN` - Your auth token
- [ ] `TWILIO_PHONE_NUMBER` - Your Twilio phone number (+1...)

### Email (Resend)
- [ ] `RESEND_API_KEY` - re_...
- [ ] `ALERT_EMAIL` - Your email for alerts (marcodefilippo@gmail.com)

### Cron-Job.org
- [ ] `CRON_SECRET` - Random string for authenticating cron requests

### App Config
- [ ] `NEXT_PUBLIC_APP_URL` - https://sitewatch.garybuilds.xyz (production URL)

---

## Database Setup (Supabase)

### 1. Create Supabase Project
- [ ] Go to https://supabase.com
- [ ] Create new project
- [ ] Note the project URL and API keys

### 2. Run Schema
- [ ] Go to Supabase Dashboard → SQL Editor
- [ ] Copy contents of `supabase/schema.sql`
- [ ] Run the SQL to create tables

### 3. Configure RLS
- [ ] Verify Row Level Security is enabled on all tables
- [ ] Test that users can only access their own data

---

## Stripe Setup

### 1. Create Products & Prices
- [ ] Go to Stripe Dashboard → Products
- [ ] Create 4 products:
  - **Free** - $0/month
  - **Starter** - $5/month  
  - **Pro** - $15/month
  - **Business** - $49/month

### 2. Get API Keys
- [ ] Developer → API Keys
- [ ] Copy Publishable key (pk_live_...)
- [ ] Copy Secret key (sk_live_...)

### 3. Webhook Setup
- [ ] Developer → Webhooks
- [ ] Add endpoint: `https://sitewatch.garybuilds.xyz/api/stripe/webhook`
- [ ] Select events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- [ ] Copy webhook signing secret

---

## Twilio Setup

### 1. Create Account
- [ ] Go to https://twilio.com
- [ ] Sign up / Log in
- [ ] Get Account SID and Auth Token

### 2. Get Phone Number
- [ ] Phone Numbers → Manage → Buy a number
- [ ] Copy the phone number (+1 format)

### 3. Verify (if using trial)
- [ ] Verify your own phone number for testing

---

## Resend Setup

### 1. Create Account
- [ ] Go to https://resend.com
- [ ] Sign up with your email
- [ ] Verify domain or use default resend.dev domain

### 2. Get API Key
- [ ] Settings → API Keys
- [ ] Create new API key
- [ ] Copy the key (re_...)

---

## Cron-Job.org Setup

### 1. Create Account
- [ ] Go to https://cron-job.org
- [ ] Sign up for free account

### 2. Create Job
- [ ] Create new cron job
- [ ] URL: `https://sitewatch.garybuilds.xyz/api/check`
- [ ] Schedule: Every 10 minutes
- [ ] Method: POST
- [ ] Add header: `Authorization: Bearer YOUR_CRON_SECRET`

---

## Vercel Deployment

### 1. Add Environment Variables
- [ ] Go to Vercel Dashboard → Project → Settings → Environment Variables
- [ ] Add all variables from the list above
- [ ] Set to Production environment

### 2. Deploy
- [ ] Vercel should auto-deploy when you push to GitHub
- [ ] Or manually trigger: Deployments → Redeploy

### 3. Configure Custom Domain (Optional)
- [ ] Settings → Domains
- [ ] Add `sitewatch.garybuilds.xyz`
- [ ] Update DNS CNAME to `cname.vercel-dns.com`

---

## Post-Deployment Testing

### Smoke Tests
- [ ] Landing page loads at production URL
- [ ] Signup works
- [ ] Login works
- [ ] Can add a website
- [ ] Monitoring check runs (wait 10 minutes or trigger manually)
- [ ] SSL data appears for HTTPS sites

### Payment Flow
- [ ] Upgrade to Starter works
- [ ] Stripe Checkout opens
- [ ] Payment succeeds
- [ ] Account upgraded in dashboard
- [ ] Can add more sites

### Alerts
- [ ] Email alert received when site goes down
- [ ] SMS alert received (if phone number configured)

---

## Security Verification

- [ ] `https://` enforced
- [ ] Security headers present (check with securityheaders.com)
- [ ] No console errors
- [ ] Cookies secure

---

## Go-Live Checklist

- [ ] All environment variables set in Vercel
- [ ] Database schema created
- [ ] Stripe products configured
- [ ] Twilio number active
- [ ] Resend API key working
- [ ] Cron job scheduled
- [ ] Smoke tests pass
- [ ] Payment flow works
- [ ] Alerts working

**LAUNCH! 🚀**