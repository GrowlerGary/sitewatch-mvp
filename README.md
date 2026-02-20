# SiteWatch - Client Website Health Monitor

A simple dashboard for agencies to monitor client websites for uptime and SSL certificate status.

## Features

- **Dashboard**: View all monitored websites with real-time status
- **Add/Remove Sites**: Simple interface to manage client websites
- **Automated Monitoring**: Checks website uptime
- **Email Alerts**: Get notified when sites go down (via Resend)
- **Clean UI**: Professional interface suitable for client presentations

## Tech Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: In-memory (resets on deploy - add Redis/DB for persistence)
- **Email**: Resend API
- **Hosting**: Vercel (free tier)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
RESEND_API_KEY=your_resend_api_key
ALERT_EMAIL=your@email.com
CRON_SECRET=random_secret_for_cron
```

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

## API Endpoints

- `GET /api/websites` - List all monitored websites
- `POST /api/websites` - Add a new website
- `DELETE /api/websites/:id` - Remove a website
- `POST /api/check` - Trigger check for all websites

## Setting Up Monitoring

Use Vercel Cron or external service (cron-job.org) to call:
```
POST https://your-domain.com/api/check
Headers: Authorization: Bearer your_cron_secret
```

## License

MIT
