import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/sendEmail';
import { getActivationReminderEmail, getRenewalReminderEmail } from '@/lib/emailTemplates';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const to = searchParams.get('to') || 'test@example.com';

    if (!type) {
      return NextResponse.json(
        { error: 'Missing type parameter: activation or renewal' },
        { status: 400 }
      );
    }

    if (type === 'activation') {
      const emailData = getActivationReminderEmail({
        customerName: 'Sarah',
        activationUrl: 'https://notastray.com/activate',
        petTagsCount: 2,
        orderId: 'TEST-001',
      });

      console.log(`[TEST EMAIL] Sending activation reminder to ${to}`);
      await sendEmail({
        to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });

      return NextResponse.json({
        success: true,
        type: 'activation',
        message: `Activation reminder sent to ${to}`,
        preview: {
          subject: emailData.subject,
          to,
          sentAt: new Date().toISOString(),
        },
      });
    }

    if (type === 'renewal') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const renewalDate = tomorrow.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const emailData = getRenewalReminderEmail({
        customerName: 'John',
        renewalDate,
        planType: 'annual',
        planPrice: 9.99,
        manageSubscriptionUrl: 'https://notastray.com/dashboard/subscription',
        cancelUrl: 'https://notastray.com/dashboard/subscription/cancel',
      });

      console.log(`[TEST EMAIL] Sending renewal reminder to ${to}`);
      await sendEmail({
        to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });

      return NextResponse.json({
        success: true,
        type: 'renewal',
        message: `Renewal reminder sent to ${to}`,
        preview: {
          subject: emailData.subject,
          to,
          sentAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      { error: 'Unknown type. Use: activation or renewal' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[TEST EMAIL] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
