import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@vidyapith-praktani.org';

let transporter: nodemailer.Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Sends an email if SMTP is configured, otherwise logs to the console.
 */
export const sendMail = async (to: string, subject: string, text: string, html: string): Promise<boolean> => {
  if (transporter) {
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        text,
        html,
      });
      console.log(`[Email Service] Sent email to ${to}: "${subject}"`);
      return true;
    } catch (error) {
      console.error(`[Email Service] Failed to send email to ${to}:`, error);
      return false;
    }
  } else {
    console.log('\n======================================================');
    console.log(`[SIMULATED EMAIL]`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${text}`);
    console.log('======================================================\n');
    return true;
  }
};
