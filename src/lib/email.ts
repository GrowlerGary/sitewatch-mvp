import { Website } from './types';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERT_EMAIL = process.env.ALERT_EMAIL;

export async function sendAlertEmail(
  website: Website,
  alertType: 'down' | 'ssl' | 'up',
  message: string
): Promise<boolean> {
  if (!RESEND_API_KEY || !ALERT_EMAIL) {
    console.log('Email alerts disabled: RESEND_API_KEY or ALERT_EMAIL not set');
    console.log('Alert would have been sent:', message);
    return false;
  }

  try {
    const subject = alertType === 'down' 
      ? `ALERT: ${website.name} is DOWN`
      : alertType === 'ssl'
      ? `SSL Expiring Soon: ${website.name}`
      : `RECOVERY: ${website.name} is UP`;

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
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${subject}</h2>
            <p><strong>Website:</strong> ${website.name}</p>
            <p><strong>URL:</strong> <a href="${website.url}">${website.url}</a></p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            <hr />
            <p>${message}</p>
            <hr />
            <p style="color: #666; font-size: 12px;">
              This alert was sent by SiteWatch
            </p>
          </div>
        `,
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
