import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { MailService } from '@sendgrid/mail';
import { log } from "../vite";

// Initialize AWS SES client with proper configuration
const ses = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Initialize SendGrid client as fallback
const sendgrid = new MailService();
if (process.env.SENDGRID_API_KEY) {
  sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendWithSES(options: EmailOptions): Promise<boolean> {
  try {
    log(`[AWS SES] Attempting to send email to ${options.to}`);
    log(`[AWS SES] Using sender email: ${process.env.AWS_SES_VERIFIED_EMAIL}`);

    const command = new SendEmailCommand({
      Source: process.env.AWS_SES_VERIFIED_EMAIL!,
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

    log('[AWS SES] Sending email command...');
    const result = await ses.send(command);
    log(`[AWS SES] Email sent successfully. MessageId: ${result.MessageId}`);
    return true;
  } catch (error: any) {
    log(`[AWS SES] Email error: ${error.message}`);
    if (error.Code) {
      log(`[AWS SES] Error code: ${error.Code}`);
    }
    if (error.$metadata) {
      log(`[AWS SES] Request ID: ${error.$metadata.requestId}`);
      log(`[AWS SES] HTTP status code: ${error.$metadata.httpStatusCode}`);
    }
    return false;
  }
}

async function sendWithSendGrid(options: EmailOptions): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    log('[SendGrid] API key is not configured');
    return false;
  }

  try {
    log(`[SendGrid] Attempting to send email to ${options.to}`);
    await sendgrid.send({
      to: options.to,
      from: process.env.AWS_SES_VERIFIED_EMAIL!, // Using the same verified email
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    log(`[SendGrid] Email sent successfully to ${options.to}`);
    return true;
  } catch (error: any) {
    log(`[SendGrid] Email error: ${error.message}`);
    if (error.response) {
      log(`[SendGrid] Status code: ${error.response.status}`);
      log(`[SendGrid] Response body: ${JSON.stringify(error.response.body)}`);
    }
    return false;
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Validate required environment variables
  if (!process.env.AWS_SES_VERIFIED_EMAIL) {
    log('[Email Service] AWS SES verified email is not configured');
    return false;
  }

  try {
    // Try AWS SES first
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      log('[Email Service] Attempting to send via AWS SES');
      const sesResult = await sendWithSES(options);
      if (sesResult) {
        log('[Email Service] Successfully sent via AWS SES');
        return true;
      }
      log("[Email Service] AWS SES failed, attempting SendGrid fallback");
    } else {
      log('[Email Service] AWS credentials not found, skipping SES');
    }

    // Fallback to SendGrid
    log('[Email Service] Attempting to send via SendGrid');
    const sendgridResult = await sendWithSendGrid(options);
    if (sendgridResult) {
      log('[Email Service] Successfully sent via SendGrid');
      return true;
    }

    // Both services failed
    log("[Email Service] All email services failed");
    return false;
  } catch (error) {
    log(`[Email Service] Unexpected error: ${error}`);
    return false;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string,
  resetUrl: string
): Promise<boolean> {
  log(`[Password Reset] Attempting to send password reset email to ${email}`);

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
    subject: 'Password Reset Request - Zecko Marketplace',
    html: htmlContent,
    text: textContent,
  });
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