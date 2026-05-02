import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendEmail';

export async function POST(request: Request) {
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

    console.log(`[TEST EMAIL] Attempting to send email to ${to}`);
    console.log(`[TEST EMAIL] SENDGRID_API_KEY configured: ${!!process.env.SENDGRID_API_KEY}`);
    console.log(`[TEST EMAIL] FROM_EMAIL: ${process.env.FROM_EMAIL || 'noreply@notastray.com'}`);

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
    console.error('[TEST EMAIL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Check console logs and verify SENDGRID_API_KEY is set in .dev.vars',
      },
      { status: 500 }
    );
  }
}
