import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendEmail';
import { withObservability } from '@/lib/observability/withObservability';
import { log } from '@/lib/observability/logger';

export const POST = withObservability('test-send-email', async (request: Request) => {
  // Only available in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { to, subject, html, text } = await request.json();

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      );
    }

    log.info('test_email_attempt', {
      sendgridConfigured: !!process.env.SENDGRID_API_KEY,
      fromEmail: process.env.FROM_EMAIL || 'noreply@notastray.com',
    });

    await sendEmail({
      to,
      subject,
      html: html || text,
      text: text || html,
    });

    return NextResponse.json({
      success: true,
      message: `Email sent successfully to ${to}`,
      details: {
        to,
        subject,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('test_email_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check console logs and verify SENDGRID_API_KEY is set in .dev.vars',
      },
      { status: 500 }
    );
  }
})
