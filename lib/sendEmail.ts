import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.warn('AWS credentials not configured, skipping email');
    return;
  }

  const from = options.from || process.env.AWS_SES_FROM_EMAIL || 'notifications@notastray.com';

  const htmlContent = options.html || options.text || '';
  const textContent = options.text || options.html || '';

  if (!htmlContent && !textContent) {
    throw new Error('Email must have either html or text content');
  }

  try {
    const command = new SendEmailCommand({
      Source: from,
      Destination: {
        ToAddresses: [options.to],
      },
      Message: {
        Subject: {
          Data: options.subject,
        },
        Body: {
          Html: {
            Data: htmlContent,
          },
          Text: {
            Data: textContent,
          },
        },
      },
    });

    await sesClient.send(command);
    console.log(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error('AWS SES error:', error);
    throw error;
  }
}
