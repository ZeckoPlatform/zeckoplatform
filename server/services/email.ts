import { SESClient, SendEmailCommand, SendBulkTemplatedEmailCommand } from "@aws-sdk/client-ses";
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.AWS_ACCESS_KEY_ID) {
  throw new Error("AWS_ACCESS_KEY_ID environment variable must be set");
}

if (!process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS_SECRET_ACCESS_KEY environment variable must be set");
}

if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION environment variable must be set");
}

const ses = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const FROM_EMAIL = 'noreply@zecko.app';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Send a single email (for transactional emails like password reset)
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          Text: {
            Data: options.text,
            Charset: 'UTF-8',
          },
        },
      },
    });

    await ses.send(command);
    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error('AWS SES email error:', error);
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

    // Send emails in batches of 50 to comply with SES limits
    const batchSize = 50;
    for (let i = 0; i < activeUsers.length; i += batchSize) {
      const batch = activeUsers.slice(i, i + batchSize);

      try {
        const command = new SendBulkTemplatedEmailCommand({
          Source: FROM_EMAIL,
          Template: 'AnnouncementTemplate',
          Destinations: batch.map(user => ({
            Destination: {
              ToAddresses: [user.email],
            },
            ReplacementTemplateData: JSON.stringify({
              subject,
              htmlContent,
              textContent,
              userId: user.id,
            }),
          })),
          DefaultTemplateData: JSON.stringify({
            subject,
            htmlContent,
            textContent,
          }),
        });

        await ses.send(command);
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