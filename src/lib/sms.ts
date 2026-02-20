import twilio from 'twilio';
import { Website } from './types';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client only if credentials are available
const twilioClient = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  : null;

export const isTwilioConfigured = () => {
  return twilioClient !== null && TWILIO_PHONE_NUMBER !== undefined;
};

export async function sendSMSAlert(
  to: string,
  website: Website,
  alertType: 'down' | 'ssl' | 'up'
): Promise<boolean> {
  if (!twilioClient || !TWILIO_PHONE_NUMBER) {
    console.log('SMS alerts disabled: Twilio not configured');
    console.log(`SMS would have been sent to ${to}: ${getAlertMessage(website, alertType)}`);
    return false;
  }

  try {
    const message = getAlertMessage(website, alertType);
    
    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: to,
    });

    console.log(`SMS sent successfully: ${result.sid}`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

function getAlertMessage(website: Website, alertType: 'down' | 'ssl' | 'up'): string {
  const siteName = website.name;
  const url = website.url;
  
  switch (alertType) {
    case 'down':
      return `🚨 ALERT: ${siteName} is DOWN!\n${url}\n\nCheck SiteWatch for details.`;
    case 'ssl':
      return `⚠️ SSL Expiring Soon: ${siteName}\n${url}\n\nSSL expires in ${website.sslDaysRemaining} days.`;
    case 'up':
      return `✅ RECOVERY: ${siteName} is back UP!\n${url}\n\nSite is responding normally.`;
    default:
      return `SiteWatch Alert: ${siteName}\n${url}`;
  }
}

export function validatePhoneNumber(phone: string): boolean {
  // Basic E.164 validation - starts with + and contains only digits
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // Assume US number if no country code
    cleaned = '+1' + cleaned;
  }
  
  return cleaned;
}
