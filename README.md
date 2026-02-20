# SiteWatch - Client Website Health Monitor

A simple dashboard for agencies to monitor client websites for uptime and SSL certificate status.

## Features

- **Dashboard**: View all monitored websites with real-time status
- **Add/Remove Sites**: Simple interface to manage client websites
- **Automated Monitoring**: Checks website uptime every 5 minutes
- **Email Alerts**: Get notified when sites go down or recover (via Resend)
- **SSL Warnings**: Alerts when SSL certificates are expiring soon
- **Clean UI**: Professional interface suitable for client presentations

## Architecture: Single Cron Job (Option A)

**This solution uses ONE Vercel Cron job to monitor UNLIMITED websites.**

### Why This Approach?

| Criteria | Our Solution |
|----------|-------------|
| **Efficiency** | ✅ Single API call checks all sites (batched) |
| **Cost** | ✅ Stays on Vercel free tier (only 1 cron job used) |
| **Scalability** | ✅ Handles 5, 20, 100+ sites with same cron job |
| **Reliability** | ✅ Vercel's managed infrastructure |
| **Setup** | ✅ Zero config - just deploy |

### How It Works

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Vercel Cron    │────▶│  /api/check         │────▶│  Site 1      │
│  (every 5 min)  │     │  (single endpoint)  │────▶│  Site 2      │
└─────────────────┘     └─────────────────────┘────▶│  Site 3...   │
                                                    └──────────────┘
```

1. **One cron job** triggers `/api/check` every 5 minutes
2. **Single endpoint** loops through ALL websites in your list
3. **No limit** on number of sites you can monitor
4. **Fits free tier** - only uses 1 of your 2 available cron jobs

### Why Not Other Options?

- **Option B (cron-job.org)**: External dependency, more complex
- **Option C (GitHub Actions)**: Requires public repo, separate setup
- **Option D (Client polling)**: Only works when dashboard is open

## Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: In-memory (resets on deploy - add Redis/DB for persistence)
- **Email**: Resend API
- **Hosting**: Vercel (free tier)
- **Monitoring**: Vercel Cron (1 job, every 5 minutes)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# Required for email alerts
RESEND_API_KEY=your_resend_api_key
ALERT_EMAIL=your@email.com

# Optional: protect manual check triggers
CRON_SECRET=random_secret_string
```

## Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and import your repo
2. Add environment variables in Settings
3. Deploy!

### 3. Verify Cron Job

The `vercel.json` file automatically configures the cron job:

```json
{
  "crons": [
    {
      "path": "/api/check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

After deployment, verify in Vercel Dashboard → Cron Jobs.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/websites` | GET | List all monitored websites |
| `/api/websites` | POST | Add a new website |
| `/api/websites/:id` | DELETE | Remove a website |
| `/api/check` | POST | Trigger check for all websites (cron calls this) |

### Manual Check Trigger

You can manually trigger a check:

```bash
# Without auth (if CRON_SECRET not set)
curl -X POST https://your-domain.com/api/check

# With auth
curl -X POST https://your-domain.com/api/check \
  -H "Authorization: Bearer your_cron_secret"
```

## How to Add Websites

1. Open the dashboard
2. Enter website name and URL
3. Click "Add Website"
4. The site will be checked on the next cron run (within 5 minutes)

## Email Alerts

You'll receive emails when:
- A website goes **down** (was up, now down)
- A website **recovers** (was down, now up)
- SSL certificate expires in **less than 14 days**

## Limitations

1. **Data Persistence**: Uses in-memory storage (resets on deploy). For production, add Redis or a database.
2. **Vercel Free Tier Limits**: 
   - 2 cron jobs max (we use 1 ✅)
   - Function execution time: 10 seconds per check batch
   - 100GB bandwidth/month
3. **SSL Checks**: Currently simulated. For real SSL monitoring, integrate with SSL Labs API or similar.

## Scaling

This architecture scales to **100+ sites** on Vercel free tier:

- One cron job handles all sites
- Checks run sequentially with 500ms delays
- 100 sites = ~50 seconds (within Vercel's limits)

If you need more:
- Upgrade to Vercel Pro for longer timeouts
- Or split sites across multiple projects

## Troubleshooting

### Cron job not running?
- Check Vercel Dashboard → Cron Jobs
- Verify `vercel.json` is committed
- Redeploy after adding `vercel.json`

### Emails not sending?
- Verify `RESEND_API_KEY` and `ALERT_EMAIL` are set
- Check Resend dashboard for delivery status
- Check server logs in Vercel

### Sites showing as down?
- Some sites block non-browser requests
- Consider adding custom headers in `monitor.ts`

## License

MIT
