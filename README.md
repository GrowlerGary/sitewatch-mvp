# SiteWatch - Website Monitoring with Freemium Model

A modern website monitoring SaaS with email + SMS alerts, SSL monitoring, and tiered pricing.

## Features

- **Free Tier**: 1 website, 10-minute checks, email alerts
- **Starter ($5/mo)**: 3 websites, 5-minute checks, 10 SMS/month
- **Pro ($15/mo)**: 10 websites, 1-minute checks, **API access**, 50 SMS/month
- **Business ($49/mo)**: 50 websites, priority support, **webhooks**, 200 SMS/month

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

### Internal API
- `GET/POST /api/websites` - List/create websites
- `GET/POST/PUT /api/user` - User management
- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/webhook` - Handle Stripe events
- `GET /api/check` - Trigger monitoring check
- `GET/POST/DELETE/PATCH /api/api-keys` - API key management

### Public API (Pro+ Tier)

The Public API allows programmatic access to your monitoring data. **Requires Pro or Business tier.**

#### Authentication
All API requests require an API key in the `X-API-Key` header:
```
X-API-Key: sw_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Generate your API key in **Settings > API Access**.

#### Rate Limits
- **100 requests per hour** per API key
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

#### Endpoints

##### List All Sites
```http
GET /api/v1/sites
```

Response:
```json
{
  "sites": [
    {
      "id": "abc123",
      "name": "My Website",
      "url": "https://example.com",
      "status": "up",
      "lastChecked": "2025-01-20T10:30:00Z",
      "sslExpiryDate": "2025-06-15T00:00:00Z",
      "sslDaysRemaining": 145,
      "responseTime": 245,
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "tier": "pro",
    "limit": 10
  }
}
```

##### Get Site Details
```http
GET /api/v1/sites/{id}
```

Response:
```json
{
  "site": {
    "id": "abc123",
    "name": "My Website",
    "url": "https://example.com",
    "status": "up",
    "lastChecked": "2025-01-20T10:30:00Z",
    "sslExpiryDate": "2025-06-15T00:00:00Z",
    "sslDaysRemaining": 145,
    "responseTime": 245,
    "lastError": null,
    "createdAt": "2025-01-01T00:00:00Z"
  },
  "recentLogs": [
    {
      "status": "up",
      "responseTime": 245,
      "checkedAt": "2025-01-20T10:30:00Z",
      "error": null,
      "sslDaysRemaining": 145
    }
  ]
}
```

##### Get Site Status & Uptime
```http
GET /api/v1/sites/{id}/status
```

Response:
```json
{
  "site": {
    "id": "abc123",
    "name": "My Website",
    "url": "https://example.com",
    "status": "up",
    "lastChecked": "2025-01-20T10:30:00Z",
    "responseTime": 245
  },
  "uptime": {
    "percentage": 99.5,
    "totalChecks": 200,
    "upChecks": 199,
    "downChecks": 1
  },
  "incidents": {
    "last24Hours": 0
  },
  "ssl": {
    "expiryDate": "2025-06-15T00:00:00Z",
    "daysRemaining": 145,
    "status": "good"
  }
}
```

#### Error Responses
```json
{
  "error": "Invalid API key"
}
```

Common status codes:
- `401` - Missing or invalid API key
- `403` - Tier doesn't have API access (requires Pro+)
- `404` - Site not found
- `429` - Rate limit exceeded
- `500` - Internal server error

## Webhooks (Business Tier)

Receive real-time notifications when events occur. **Requires Business tier.**

### Configuration
1. Go to **Settings > Outgoing Webhooks**
2. Enter your webhook URL
3. Save to receive the webhook secret

### Webhook Payload

All webhooks are sent as POST requests with JSON payloads:

```json
{
  "event": "site.down",
  "timestamp": "2025-01-20T10:30:00Z",
  "site": {
    "id": "abc123",
    "name": "My Website",
    "url": "https://example.com",
    "status": "down"
  },
  "data": {
    "previousStatus": "up",
    "error": "Connection timeout",
    "responseTime": null
  }
}
```

### Event Types

| Event | Description | Data Fields |
|-------|-------------|-------------|
| `site.down` | Site went down | `previousStatus`, `error`, `responseTime` |
| `site.up` | Site came back up | `previousStatus`, `responseTime` |
| `ssl.expiring_soon` | SSL expires in 30/14/7 days | `sslDaysRemaining` |

### Signature Verification

Webhooks are signed with HMAC-SHA256 for security. Verify the signature using the `X-Webhook-Signature` header:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// Usage
app.post('/webhooks/sitewatch', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Event:', req.body.event);
  res.sendStatus(200);
});
```

### Retry Logic
- **3 attempts** with exponential backoff (1s, 2s, 4s)
- Webhooks are retried on 5xx errors or timeouts
- 4xx errors are not retried (fix your endpoint)
- 30-second timeout per request

### Best Practices
1. **Verify signatures** - Always verify the webhook signature
2. **Respond quickly** - Return 200 OK within a few seconds
3. **Process asynchronously** - Queue webhook processing if it takes time
4. **Handle duplicates** - Webhooks may be sent multiple times (idempotency)

## Environment Variables

See `.env.example` for all required variables.

## License

MIT
