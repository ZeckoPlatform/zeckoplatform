import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { log } from "../vite";

// Initialize AWS SES client with proper configuration
const ses = new SESClient({
  region: 'eu-north-1', // Explicitly set region to Stockholm
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  },
  endpoint: `https://email.eu-north-1.amazonaws.com`
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function sendWithSES(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    log(`[AWS SES] Attempting to send email to ${options.to}`);
    log(`[AWS SES] Using sender email: ${process.env.AWS_SES_VERIFIED_EMAIL}`);
    log(`[AWS SES] Using AWS region: eu-north-1`);

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
    return { success: true };
  } catch (error: any) {
    log(`[AWS SES] Email error: ${error.message}`);
    if (error.Code) {
      log(`[AWS SES] Error code: ${error.Code}`);
    }
    if (error.$metadata) {
      log(`[AWS SES] Request ID: ${error.$metadata.requestId}`);
      log(`[AWS SES] HTTP status code: ${error.$metadata.httpStatusCode}`);
    }

    // Check for sandbox mode restrictions
    if (error.message.includes('not verified')) {
      return {
        success: false,
        error: "Your email address is not verified in our system. During the testing phase, please use zeckoinfo@gmail.com for password resets. For production use, we'll need to verify your email address first."
      };
    }

    return { 
      success: false,
      error: "Failed to send email. Please try again later."
    };
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Validate required environment variables
  if (!process.env.AWS_SES_VERIFIED_EMAIL) {
    log('[Email Service] AWS SES verified email is not configured');
    return false;
  }

  try {
    // Try AWS SES
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      log('[Email Service] Attempting to send via AWS SES');
      const result = await sendWithSES(options);
      if (result.success) {
        log('[Email Service] Successfully sent via AWS SES');
        return true;
      }
      log("[Email Service] AWS SES failed to send email");
      if (result.error) {
        throw new Error(result.error);
      }
    } else {
      log('[Email Service] AWS credentials not found');
    }

    return false;
  } catch (error) {
    log(`[Email Service] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error; // Propagate the error with the custom message
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