import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { prisma } from '../config/db.js';
import { sendMail } from '../services/mail.service.js';

// Setup environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project paths
const backendRoot = path.join(__dirname, '..', '..');
const configPath = path.join(backendRoot, 'email-content.json');
const progressPath = path.join(backendRoot, 'sent-progress.json');

async function run() {
  console.log('======================================================');
  console.log('[Batch Email Script] Starting execution...');
  console.log('======================================================\n');

  // 1. Check if email-content.json exists
  if (!fs.existsSync(configPath)) {
    console.error(`Error: Configuration file not found at: ${configPath}`);
    console.error('Please create email-content.json in the backend root directory before running this script.');
    process.exit(1);
  }

  // 2. Load email content configuration
  let emailConfig: { subject: string; text: string; html: string };
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    emailConfig = JSON.parse(fileContent);
    if (!emailConfig.subject || !emailConfig.text || !emailConfig.html) {
      throw new Error('Missing one or more required fields (subject, text, html).');
    }
  } catch (err: any) {
    console.error(`Error reading or parsing email-content.json: ${err.message}`);
    process.exit(1);
  }

  // 3. Load progress file (sent-progress.json) to prevent double sending
  let sentEmails: string[] = [];
  if (fs.existsSync(progressPath)) {
    try {
      const progressContent = fs.readFileSync(progressPath, 'utf-8');
      sentEmails = JSON.parse(progressContent);
      if (!Array.isArray(sentEmails)) {
        sentEmails = [];
      }
    } catch (err: any) {
      console.warn(`Warning: Could not parse sent-progress.json (${err.message}). Starting with empty list.`);
    }
  }

  const sentSet = new Set(sentEmails);
  console.log(`Loaded ${sentSet.size} emails from progress history to skip duplicate sending.`);

  // 4. Fetch all approved users
  console.log('Fetching users with "approved" verification status...');
  let approvedUsers;
  try {
    approvedUsers = await prisma.user.findMany({
      where: { verify_status: 'approved' },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            full_name: true
          }
        }
      }
    });
  } catch (err: any) {
    console.error(`Failed to fetch approved users from database: ${err.message}`);
    process.exit(1);
  }

  console.log(`Found ${approvedUsers.length} total approved users in the database.`);

  const pendingUsers = approvedUsers.filter(u => !sentSet.has(u.email));
  console.log(`Skipping ${approvedUsers.length - pendingUsers.length} already-sent users.`);
  console.log(`Pending emails to send: ${pendingUsers.length}\n`);

  if (pendingUsers.length === 0) {
    console.log('No new approved users to email. Task complete!');
    return;
  }

  // 5. Send emails with throttling (e.g., 200ms delay between emails)
  const isSimulation = !process.env.RESEND_API_KEY;
  if (isSimulation) {
    console.log('⚠️  RESEND_API_KEY is not configured. Running in SIMULATION MODE (printing to stdout).\n');
  } else {
    console.log('🚀 Running in LIVE MODE using configured Resend API Key...\n');
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < pendingUsers.length; i++) {
    const user = pendingUsers[i];
    const recipientName = user.profile?.full_name || 'Vidyapith Alumnus';
    
    // Replace dynamic placeholders if present
    const personalizedSubject = emailConfig.subject.replace(/{{name}}/g, recipientName);
    const personalizedText = emailConfig.text.replace(/{{name}}/g, recipientName);
    const personalizedHtml = emailConfig.html.replace(/{{name}}/g, recipientName);

    console.log(`[${i + 1}/${pendingUsers.length}] Sending to ${user.email} (${recipientName})...`);
    
    try {
      const result = await sendMail(
        user.email,
        personalizedSubject,
        personalizedText,
        personalizedHtml
      );

      if (result) {
        successCount++;
        // Update progress log immediately to prevent duplicate sending if interrupted
        sentEmails.push(user.email);
        fs.writeFileSync(progressPath, JSON.stringify(sentEmails, null, 2), 'utf-8');
      } else {
        failCount++;
        console.error(`Failed to send email to ${user.email} (mail service returned false).`);
      }
    } catch (err: any) {
      failCount++;
      console.error(`Error sending email to ${user.email}: ${err.message}`);
    }

    // Small delay between sends to respect rate limits
    if (i < pendingUsers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log('\n======================================================');
  console.log('[Batch Email Script] Execution Completed!');
  console.log(`- Successfully sent: ${successCount}`);
  console.log(`- Failed:            ${failCount}`);
  console.log(`- Total processed:   ${successCount + failCount}`);
  console.log(`Progress has been saved to: ${progressPath}`);
  console.log('======================================================\n');
}

run()
  .catch(err => {
    console.error('Fatal error during script execution:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
