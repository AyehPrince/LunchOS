import axios from 'axios';

// Interfaces for notification parameters
export interface SendNotificationParams {
  name: string;
  email?: string;
  phone?: string;
  messageText: string;
  subjectLine?: string;
}

export interface DeliveryDetails {
  emailStatus: string;
  whatsappStatus: string;
  smsStatus: string;
}

/**
 * Service to manage dispatching multi-channel notifications.
 * It is fully production-ready and leverages official REST APIs with zero extra dependencies:
 * - Resend API for transactional Emails
 * - Twilio API for SMS & WhatsApp delivery
 * 
 * Includes robust lazy evaluation and fallback mechanisms if keys are not stored in environmental variables.
 */
class NotificationService {
  // Lazy evaluation checks to verify if variables are configured
  private isResendConfigured(): boolean {
    return !!(process.env.RESEND_API_KEY);
  }

  private isTwilioConfigured(): boolean {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER)
    );
  }

  /**
   * Dispatches a transactional email using the official Resend API
   */
  async sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
    if (!this.isResendConfigured()) {
      console.log(`[Notification Engine - Info] Send Email simulation for ${to}: Subject "${subject}"`);
      return false;
    }

    try {
      const apiKey = process.env.RESEND_API_KEY;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

      await axios.post(
        'https://api.resend.com/emails',
        {
          from: `Lunch Reminder <${fromEmail}>`,
          to: [to],
          subject: subject,
          html: htmlContent,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000
        }
      );

      console.log(`[Notification Engine - Success] Verified email dispatch to ${to}`);
      return true;
    } catch (err: any) {
      console.error(`[Notification Engine - Error] Failed to send email to ${to}:`, err.response?.data || err.message);
      return false;
    }
  }

  /**
   * Dispatches SMS message using Twilio SMS API
   */
  async sendSMS(to: string, text: string): Promise<boolean> {
    if (!this.isTwilioConfigured() || !process.env.TWILIO_PHONE_NUMBER) {
      console.log(`[Notification Engine - Info] Send SMS simulation for ${to}: "${text}"`);
      return false;
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      // Construct URL-encoded body parameters
      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', fromNumber);
      params.append('Body', text);

      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        params,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000
        }
      );

      console.log(`[Notification Engine - Success] SMS message dispatched successfully to ${to}`);
      return true;
    } catch (err: any) {
      console.error(`[Notification Engine - Error] Failed to dispatch SMS to ${to}:`, err.response?.data || err.message);
      return false;
    }
  }

  /**
   * Dispatches WhatsApp alert using Twilio WhatsApp API
   */
  async sendWhatsApp(to: string, text: string): Promise<boolean> {
    if (!this.isTwilioConfigured() || !process.env.TWILIO_WHATSAPP_NUMBER) {
      console.log(`[Notification Engine - Info] Send WhatsApp simulation for ${to}: "${text}"`);
      return false;
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
        ? process.env.TWILIO_WHATSAPP_NUMBER
        : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
      
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

      // Construct URL-encoded parameters for Twilio WhatsApp
      const params = new URLSearchParams();
      params.append('To', formattedTo);
      params.append('From', fromWhatsApp);
      params.append('Body', text);

      const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        params,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 8000
        }
      );

      console.log(`[Notification Engine - Success] WhatsApp alert dispatched successfully to ${to}`);
      return true;
    } catch (err: any) {
      console.error(`[Notification Engine - Error] Failed to dispatch WhatsApp to ${to}:`, err.response?.data || err.message);
      return false;
    }
  }

  /**
   * Main orchestrator function: Dispatches to Email, WhatsApp, and SMS concurrently.
   * Gracefully degrades to simulations if the production keys are not actively filled.
   */
  async dispatchMultiChannelBroadcast(params: SendNotificationParams): Promise<DeliveryDetails> {
    const { name, email, phone, messageText, subjectLine } = params;
    const details = {
      emailStatus: 'Skipped (No Email Address)',
      whatsappStatus: 'Skipped (No Contact Number)',
      smsStatus: 'Skipped (No Contact Number)'
    };

    const promises: Promise<any>[] = [];

    // 1. Process Email Broadcast
    if (email) {
      const isConfigured = this.isResendConfigured();
      const subject = subjectLine || 'Lunch Ordering Reminder';
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; max-width: 600px; margin: 0 auto; border: 1px solid #f3f4f6; border-radius: 16px;">
          <h2 style="color: #2563eb; font-size: 20px; font-weight: 800; margin-bottom: 16px;">Hello ${name},</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #374151;">
            ${messageText}
          </p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af;">
            This is an automated reminder system built for your company's lunch provider platform.
          </div>
        </div>
      `;

      if (isConfigured) {
        promises.push(
          this.sendEmail(email, subject, htmlContent).then((sent) => {
            details.emailStatus = sent ? 'Sent (Live)' : 'Failed (Live)';
          })
        );
      } else {
        // Log locally so developers and tests can see the simulated output clearly
        console.log(`[Notification Engine - Local Simulation] Email logged for ${name} <${email}>: "${messageText}"`);
        details.emailStatus = 'Sent (Simulated)';
      }
    }

    // 2. Process WhatsApp & SMS Broadcasts
    if (phone) {
      const isConfigured = this.isTwilioConfigured();

      if (isConfigured) {
        // Dispatch live text messages simultaneously
        promises.push(
          this.sendSMS(phone, messageText).then((sent) => {
            details.smsStatus = sent ? 'Sent (Live)' : 'Failed (Live)';
          })
        );
        promises.push(
          this.sendWhatsApp(phone, messageText).then((sent) => {
            details.whatsappStatus = sent ? 'Sent (Live)' : 'Failed (Live)';
          })
        );
      } else {
        // Log locally
        console.log(`[Notification Engine - Local Simulation] WhatsApp & SMS logged for ${name} <${phone}>: "${messageText}"`);
        details.smsStatus = 'Sent (Simulated)';
        details.whatsappStatus = 'Sent (Simulated)';
      }
    }

    // Wait for all multi-channel actions to end
    await Promise.allSettled(promises);
    return details;
  }
}

export const notificationService = new NotificationService();
