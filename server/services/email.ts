import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.MAILGUN_API_KEY) {
  throw new Error("MAILGUN_API_KEY environment variable must be set");
}

if (!process.env.MAILGUN_DOMAIN) {
  throw new Error("MAILGUN_DOMAIN environment variable must be set");
}

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

const FROM_EMAIL = `noreply@${process.env.MAILGUN_DOMAIN}`;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Send a single email (for transactional emails like password reset)
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Mailgun email error:', error);
    return false;
  }
}

// Send mass emails to all active users (for announcements)
export async function sendMassEmail(subject: string, htmlContent: string, textContent: string): Promise<{
  success: boolean;
  totalSent: number;
  errors: number;
}> {
  try {
    // Get all active users
    const activeUsers = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.active, true));

    let successCount = 0;
    let errorCount = 0;

    // Send emails in batches of 100 to avoid rate limits
    const batchSize = 100;
    for (let i = 0; i < activeUsers.length; i += batchSize) {
      const batch = activeUsers.slice(i, i + batchSize);
      const recipients = batch.map(user => user.email).join(',');

      try {
        await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
          from: FROM_EMAIL,
          to: recipients,
          subject: subject,
          text: textContent,
          html: htmlContent,
          'recipient-variables': JSON.stringify(
            batch.reduce((acc, user) => ({
              ...acc,
              [user.email]: { id: user.id }
            }), {})
          )
        });
        successCount += batch.length;
      } catch (error) {
        console.error(`Error sending batch email: ${error}`);
        errorCount += batch.length;
      }

      // Add a small delay between batches to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Mass email sent. Success: ${successCount}, Errors: ${errorCount}`);
    return {
      success: true,
      totalSent: successCount,
      errors: errorCount,
    };
  } catch (error) {
    console.error('Error sending mass email:', error);
    return {
      success: false,
      totalSent: 0,
      errors: 0,
    };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string
): Promise<boolean> {
  const htmlContent = `
    <h2>Password Reset Request</h2>
    <p>You have requested to reset your password. Click the link below to proceed:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>This link will expire in 1 hour.</p>
  `;

  const textContent = `
    Password Reset Request

    You have requested to reset your password. Click the link below to proceed:
    ${resetUrl}

    If you didn't request this, please ignore this email.
    This link will expire in 1 hour.
  `;

  return sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: htmlContent,
    text: textContent,
  });
}