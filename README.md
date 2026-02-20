# SiteWatch - Client Website Health Monitor

A simple dashboard for agencies to monitor client websites for uptime and SSL certificate status.

## Features

- **Dashboard**: View all monitored websites with real-time status
- **Add/Remove Sites**: Simple interface to manage client websites
- **Automated Monitoring**: Checks website uptime every 5-10 minutes
- **Email Alerts**: Get notified when sites go down or recover (via Resend)
- **SSL Warnings**: Alerts when SSL certificates are expiring soon
- **Clean UI**: Professional interface suitable for client presentations

## Architecture: Single Cron Job + Vercel Free Tier

**This solution uses cron-job.org (free external service) to monitor UNLIMITED websites on Vercel free tier.**

### Why This Approach?

| Criteria | Our Solution |
|----------|-------------|
| **Efficiency** | ✅ Single API call checks all sites (batched) |
| **Cost** | ✅ Stays on Vercel free tier |
| **Scheduling** | ✅ cron-job.org provides frequent checks (5-10 min) |
| **Scalability** | ✅ Handles 5, 20, 100+ sites with same setup |
| **Reliability** | ✅ External cron service + Vercel hosting |

### How It Works

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Cron-Job.org    │────▶│  /api/check         │────▶│  Site 1      │
│  (every 5-10 min)│     │  (single endpoint)  │────▶│  Site 2      │
└──────────────────┘     └─────────────────────┘────▶│  Site 3...   │
                                                     └──────────────┘
```

1. **cron-job.org** triggers `/api/check` every 5-10 minutes (free)
2. **Single endpoint** loops through ALL websites in your list
3. **No limit** on number of sites you can monitor
4. **Fits Vercel free tier** - no Vercel cron jobs needed

### Why Cron-Job.org?

Vercel Hobby tier only allows **daily** cron jobs, which isn't frequent enough for monitoring. Cron-job.org provides:

- ✅ Free tier with checks every minute
- ✅ Easy web interface
- ✅ Email notifications if jobs fail
- ✅ No credit card required

## Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: In-memory (resets on deploy - add Redis/DB for persistence)
- **Email**: Resend API
- **Hosting**: Vercel (free tier)
- **Scheduling**: Cron-Job.org (free external service)

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

### 3. Set Up Cron-Job.org

1. **Sign up** at [cron-job.org](https://cron-job.org)
2. **Create a new job**:
   - **URL**: `https://your-domain.vercel.app/api/check`
   - **Schedule**: Every 5 or 10 minutes
   - **Method**: POST
3. **Add Authentication** (if you set CRON_SECRET):
   - Header: `Authorization: Bearer your_cron_secret`
4. **Save and test** the job

See [DEPLOY.md](DEPLOY.md) for detailed instructions.

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
4. The site will be checked on the next cron run (within 5-10 minutes)

## Email Alerts

You'll receive emails when:
- A website goes **down** (was up, now down)
- A website **recovers** (was down, now up)
- SSL certificate expires in **less than 14 days**

## Limitations

1. **Data Persistence**: Uses in-memory storage (resets on deploy). For production, add Redis or a database.
2. **Vercel Free Tier Limits**: 
   - Function execution time: 10 seconds per check batch
   - 100GB bandwidth/month
3. **SSL Checks**: Currently simulated. For real SSL monitoring, integrate with SSL Labs API or similar.

## Scaling

This architecture scales to **100+ sites** on Vercel free tier:

- One cron-job.org job handles all sites
- Checks run sequentially with 500ms delays
- 100 sites = ~50 seconds (within Vercel's limits)

If you need more:
- Upgrade to Vercel Pro for longer timeouts
- Or split sites across multiple projects

## Troubleshooting

### Cron job not running?
- Check Cron-Job.org dashboard for job status
- Verify the URL is correct
- Check if CRON_SECRET is set correctly

### Emails not sending?
- Verify `RESEND_API_KEY` and `ALERT_EMAIL` are set
- Check Resend dashboard for delivery status
- Check server logs in Vercel

### Sites showing as down?
- Some sites block non-browser requests
- Consider adding custom headers in `monitor.ts`

## License

MIT
