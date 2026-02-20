# SiteWatch Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Prepare Your Code

```bash
cd sitewatch-mvp
npm install
```

### Step 2: Set Up Environment Variables

Create `.env.local` for local testing:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
ALERT_EMAIL=youremail@example.com
CRON_SECRET=any_random_string_here
```

### Step 3: Test Locally

```bash
npm run dev
```

Add a few test websites, click "Check Now" to verify it works.

### Step 4: Push to GitHub

```bash
git init
git add .
git commit -m "Initial SiteWatch deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/sitewatch.git
git push -u origin main
```

### Step 5: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. Framework preset: Next.js
4. Add environment variables:
   - `RESEND_API_KEY`
   - `ALERT_EMAIL`
   - `CRON_SECRET`
5. Click Deploy

### Step 6: Verify Cron Job

After deployment:

1. Go to Vercel Dashboard → Your Project → Cron Jobs
2. You should see: `*/5 * * * *` → `/api/check`
3. Status should be "Active"

### Step 7: Test Monitoring

1. Open your deployed dashboard
2. Add 3+ websites
3. Wait 5 minutes OR manually trigger:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/check \
     -H "Authorization: Bearer your_cron_secret"
   ```
4. Check that all sites were checked

## Architecture Explained

### Why Single Cron Job?

Vercel free tier = 2 cron jobs max.

**Old approach (bad):** One cron per site = limited to 2 sites ❌

**Our approach (good):** One cron checks ALL sites = unlimited sites ✅

```
Vercel Cron (1 job)
    │
    ▼
/api/check ──▶ Check Site 1
    │
    ├──▶ Check Site 2
    │
    ├──▶ Check Site 3
    │
    └──▶ Check Site 4, 5, 6...
```

### Monitoring Flow

1. Every 5 minutes, Vercel triggers `/api/check`
2. Server loops through all websites in memory
3. Each site is checked with a 500ms delay
4. Status updates are saved in memory
5. Email alerts sent on status changes

## Free Tier Limits

| Resource | Limit | Our Usage |
|----------|-------|-----------|
| Cron jobs | 2 | 1 ✅ |
| Function duration | 10s | ~1s per 2 sites ✅ |
| Bandwidth | 100GB/mo | Minimal ✅ |
| Build time | 6000 min/mo | ~2 min per deploy ✅ |

## Scaling Guide

### For 5-20 sites
- ✅ Works perfectly on free tier
- ~5-10 seconds per check cycle

### For 20-50 sites
- ✅ Still works on free tier
- ~25-30 seconds per check cycle
- Consider upgrading if you need faster checks

### For 50-100 sites
- ⚠️ Approaching timeout limits
- Either:
  - Upgrade to Vercel Pro (longer timeouts)
  - Reduce check frequency (e.g., every 10 min)
  - Split across multiple projects

### For 100+ sites
- ❌ Exceeds free tier limits
- Options:
  1. Vercel Pro ($20/mo)
  2. Use external cron service (cron-job.org)
  3. Split into multiple free projects

## Adding Persistence

Currently data resets on every deploy. To persist:

### Option 1: Redis (Recommended)

```bash
npm install redis
```

Update `db.ts` to use Redis instead of in-memory arrays.

### Option 2: PostgreSQL

Use Vercel Postgres or Supabase for persistent storage.

## Troubleshooting

### Issue: Cron job shows "Error"

**Check:**
1. Vercel Logs (Dashboard → Functions)
2. Is `vercel.json` committed to repo?
3. Environment variables set correctly?

### Issue: Sites always show "Unknown"

**Fix:**
```bash
# Manually trigger first check
curl -X POST https://your-domain.vercel.app/api/check
```

### Issue: "Function timed out"

**Cause:** Too many sites for 10-second limit

**Fix:**
- Reduce number of sites, OR
- Upgrade to Vercel Pro (longer timeouts)

### Issue: Emails not sending

**Check:**
1. Resend API key is valid
2. Email is verified in Resend dashboard
3. `ALERT_EMAIL` is set correctly
4. Check Resend dashboard for blocked emails

## Next Steps

After deployment:

1. [ ] Add your client websites
2. [ ] Verify email alerts work (test with a broken URL)
3. [ ] Set up custom domain (optional)
4. [ ] Add team members to Vercel project (optional)

## Support

- Resend: [resend.com](https://resend.com) for email issues
- Vercel: [vercel.com/help](https://vercel.com/help) for hosting issues
