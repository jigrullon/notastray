import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      // For privacy, return success even if user not found
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Unsubscribed</title>
            <style>
              body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
              .container { background: white; padding: 40px; border-radius: 8px; text-align: center; max-width: 500px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              h1 { color: #047857; margin-bottom: 10px; }
              p { color: #666; line-height: 1.6; margin: 15px 0; }
              .note { background: #f0fdf4; border-left: 4px solid #047857; padding: 15px; text-align: left; margin-top: 20px; }
              a { color: #047857; text-decoration: none; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✓ Unsubscribed</h1>
              <p>You have been unsubscribed from email notifications.</p>
              <p>You can manage your notification preferences anytime by logging into your NotAStray dashboard.</p>
              <div class="note">
                <p><strong>Need help?</strong><br>If you need to resubscribe or have questions, please contact us at support@notastray.com</p>
              </div>
              <p style="margin-top: 30px; font-size: 12px; color: #999;">
                <a href="https://notastray.com">Return to NotAStray</a>
              </p>
            </div>
          </body>
        </html>
        `,
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    const userId = usersSnapshot.docs[0].id;

    // Update user preferences
    await adminDb.collection('users').doc(userId).set(
      {
        preferences: {
          email: {
            optIn: false,
            unsubscribedAt: new Date().toISOString(),
            unsubscribeMethod: 'email_link',
          },
        },
      },
      { merge: true }
    );

    // Log unsubscribe event
    await adminDb.collection('unsubscribe_events').add({
      userId,
      email,
      type: 'email',
      method: 'email_link',
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    console.log(`User ${userId} unsubscribed from email notifications`);

    // Return HTML confirmation page
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Unsubscribed</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .container { background: white; padding: 40px; border-radius: 8px; text-align: center; max-width: 500px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            h1 { color: #047857; margin-bottom: 10px; }
            p { color: #666; line-height: 1.6; margin: 15px 0; }
            .note { background: #f0fdf4; border-left: 4px solid #047857; padding: 15px; text-align: left; margin-top: 20px; }
            a { color: #047857; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Unsubscribed</h1>
            <p>You have been unsubscribed from email notifications.</p>
            <p>Your notification preferences have been updated in your dashboard.</p>
            <div class="note">
              <p><strong>Want to resubscribe?</strong><br>Log into your dashboard and toggle email notifications back on anytime.</p>
              <p><strong>Questions?</strong><br>Contact us at support@notastray.com</p>
            </div>
            <p style="margin-top: 30px;">
              <a href="https://notastray.com/dashboard">Go to Dashboard</a> | <a href="https://notastray.com">Return to NotAStray</a>
            </p>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}
