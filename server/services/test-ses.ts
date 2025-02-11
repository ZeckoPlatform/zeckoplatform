import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { log } from "../vite";

async function testSESConfiguration() {
  try {
    log('Starting AWS SES Configuration Test');
    
    // Log environment variables (partial values for security)
    const envCheck = {
      region: process.env.AWS_REGION || 'not set',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ? `${process.env.AWS_ACCESS_KEY_ID.substring(0, 5)}...` : 'not set',
      secretKey: process.env.AWS_SECRET_ACCESS_KEY ? 'present (hidden)' : 'not set',
      senderEmail: process.env.AWS_SES_VERIFIED_EMAIL || 'not set'
    };
    
    log('Environment Variables Check:', JSON.stringify(envCheck, null, 2));

    // Initialize SES Client
    const ses = new SESClient({
      region: process.env.AWS_REGION || 'eu-west-2',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      },
      endpoint: `https://email.${process.env.AWS_REGION || 'eu-west-2'}.amazonaws.com`
    });

    log('SES Client initialized');

    // Create test email command
    const command = new SendEmailCommand({
      Source: process.env.AWS_SES_VERIFIED_EMAIL!,
      Destination: {
        ToAddresses: [process.env.AWS_SES_VERIFIED_EMAIL!], // Send to the same verified email
      },
      Message: {
        Subject: {
          Data: 'AWS SES Test Email',
          Charset: 'UTF-8',
        },
        Body: {
          Text: {
            Data: 'This is a test email to verify AWS SES configuration.',
            Charset: 'UTF-8',
          },
        },
      },
    });

    log('Attempting to send test email...');
    const result = await ses.send(command);
    log('Test email sent successfully!', JSON.stringify(result, null, 2));
    return true;
  } catch (error: any) {
    log('AWS SES Test Failed:', error);
    if (error.Code) {
      log('Error Code:', error.Code);
    }
    if (error.$metadata) {
      log('Request ID:', error.$metadata.requestId);
      log('HTTP Status Code:', error.$metadata.httpStatusCode);
    }
    return false;
  }
}

export { testSESConfiguration };
