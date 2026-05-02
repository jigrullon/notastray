import { MailDataRequired } from '@sendgrid/mail';

const sgMail = require('@sendgrid/mail');

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not configured, skipping email');
    return;
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const from = options.from || process.env.FROM_EMAIL || 'noreply@notastray.com';

  const msg: MailDataRequired = {
    to: options.to,
    from,
    subject: options.subject,
    text: options.text || '',
    html: options.html || '',
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
}
