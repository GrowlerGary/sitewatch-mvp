import { Website, User } from './types';
import { sendSMSAlert, validatePhoneNumber } from './sms';
import { TIERS } from './tiers';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL;

export async function sendAlert(
  website: Website,
  alertType: 'down' | 'ssl' | 'up',
  user: User | null
): Promise<{ email: boolean; sms: boolean }> {
  const results = { email: false, sms: false };

  // Always try to send email
  results.email = await sendAlertEmail(website, alertType);

  // Send SMS only if user has phone and plan supports it
  if (user && user.phoneNumber && canSendSMS(user)) {
    results.sms = await sendSMSAlert(user.phoneNumber, website, alertType);
    if (results.sms) {
      // Increment SMS count
      await import('./db').then(db => db.incrementSMSCount(user.id));
    }
  }

  return results;
}

function canSendSMS(user: User): boolean {
  const tier = TIERS[user.plan as keyof typeof TIERS];
  if (!tier) return false;
  
  // Free tier gets no SMS, paid tiers get effectively unlimited (generous limit)
  if (user.plan === 'free') return false;
  
  // Check if user has remaining SMS quota (generous limit for paid tiers)
  return user.smsCountMonthly < 1000;
}

export async function sendAlertEmail(
  website: Website,
  alertType: 'down' | 'ssl' | 'up',
  customMessage?: string
): Promise<boolean> {
  if (!RESEND_API_KEY || !ALERT_EMAIL) {
    console.log('Email alerts disabled: RESEND_API_KEY or ALERT_EMAIL not set');
    console.log('Alert would have been sent:', getAlertMessage(website, alertType, customMessage));
    return false;
  }

  try {
    const subject = getSubject(website, alertType);
    const message = customMessage || getAlertMessage(website, alertType);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SiteWatch <alerts@sitewatch.dev>',
        to: [ALERT_EMAIL],
        subject,
        html: generateEmailHTML(website, alertType, message),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send email:', error);
      return false;
    }

    console.log('Alert email sent successfully');
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

function getSubject(website: Website, alertType: 'down' | 'ssl' | 'up'): string {
  switch (alertType) {
    case 'down':
      return `🚨 ALERT: ${website.name} is DOWN`;
    case 'ssl':
      return `⚠️ SSL Expiring Soon: ${website.name}`;
    case 'up':
      return `✅ RECOVERY: ${website.name} is UP`;
    default:
      return `SiteWatch Alert: ${website.name}`;
  }
}

function getAlertMessage(website: Website, alertType: 'down' | 'ssl' | 'up', customMessage?: string): string {
  if (customMessage) return customMessage;

  switch (alertType) {
    case 'down':
      return `Website ${website.name} (${website.url}) is not responding. Last error: ${website.lastError || 'Unknown error'}`;
    case 'ssl':
      return `SSL certificate for ${website.name} expires in ${website.sslDaysRemaining} days.`;
    case 'up':
      return `Website ${website.name} is back online and responding normally.`;
    default:
      return `Alert for ${website.name}`;
  }
}

function generateEmailHTML(website: Website, alertType: 'down' | 'ssl' | 'up', message: string): string {
  const colors = {
    down: '#ef4444',
    ssl: '#f59e0b',
    up: '#22c55e',
  };

  const icons = {
    down: '🚨',
    ssl: '⚠️',
    up: '✅',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>SiteWatch Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">
              <!-- Header -->
              <tr>
                <td style="background: ${colors[alertType]}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <span style="font-size: 48px;">${icons[alertType]}</span>
                  <h1 style="color: white; margin: 10px 0 0 0; font-size: 24px;">${getSubject(website, alertType)}</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <strong style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Website</strong>
                        <p style="margin: 5px 0 0 0; font-size: 18px; color: #111827;">${website.name}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <strong style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">URL</strong>
                        <p style="margin: 5px 0 0 0; font-size: 16px;">
                          <a href="${website.url}" style="color: #3b82f6; text-decoration: none;">${website.url}</a>
                        </p>
                      </td>
                    </tr>
                    ${website.responseTime ? `
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <strong style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Response Time</strong>
                        <p style="margin: 5px 0 0 0; font-size: 16px; color: #111827;">${website.responseTime}ms</p>
                      </td>
                    </tr>
                    ` : ''}
                    ${website.sslDaysRemaining !== null ? `
                    <tr>
                      <td style="padding-bottom: 20px;">
                        <strong style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">SSL Days Remaining</strong>
                        <p style="margin: 5px 0 0 0; font-size: 16px; color: ${website.sslDaysRemaining < 7 ? '#ef4444' : '#111827'};">${website.sslDaysRemaining} days</p>
                      </td>
                    </tr>
                    ` : ''}
                    <tr>
                      <td style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <strong style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Message</strong>
                        <p style="margin: 5px 0 0 0; font-size: 16px; color: #111827; line-height: 1.5;">${message}</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 20px;">
                        <p style="margin: 0; font-size: 14px; color: #6b7280;">
                          <strong>Time:</strong> ${new Date().toLocaleString()}
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                    This alert was sent by SiteWatch<br>
                    <a href="#" style="color: #6b7280; text-decoration: none;">Manage your alerts</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Backward compatibility
export { sendAlertEmail as sendAlertEmailLegacy };
