import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Vidyapith Connect <no-reply@vidyapith.online>';

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

/**
 * Sends an email if Resend is configured, otherwise logs to the console.
 */
export const sendMail = async (to: string, subject: string, text: string, html: string): Promise<boolean> => {
  if (resend) {
    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to,
        subject,
        text,
        html,
      });
      console.log(`[Email Service via Resend] Sent email to ${to}: "${subject}"`);
      return true;
    } catch (error) {
      console.error(`[Email Service via Resend] Failed to send email to ${to}:`, error);
      return false;
    }
  } else {
    console.log('\n======================================================');
    console.log(`[SIMULATED EMAIL (Resend not configured)]`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${text}`);
    console.log('======================================================\n');
    return true;
  }
};
