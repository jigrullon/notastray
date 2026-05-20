import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

// Handles incoming SMS STOP commands (from Twilio or other SMS provider webhook)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      phoneNumber,
      message,
      providerId, // e.g., "twilio", "aws_pinpoint"
      timestamp,
    } = body;

    if (!phoneNumber || !message) {
      return NextResponse.json(
        { error: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Check if message contains STOP command
    const stopKeywords = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPT OUT', 'END'];
    const messageUpper = message.toUpperCase().trim();
    const isStopped = stopKeywords.some(keyword =>
      messageUpper === keyword || messageUpper.startsWith(keyword + ' ')
    );

    if (!isStopped) {
      // Not a STOP message, ignore
      return NextResponse.json({
        success: true,
        processed: false,
        reason: 'Not a STOP command',
      });
    }

    // Find user by phone number (you may need to hash/encrypt this based on your schema)
    const usersSnapshot = await adminDb
      .collection('users')
      .where('phone', '==', phoneNumber)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.log(`STOP received from unknown number: ${phoneNumber}`);
      return NextResponse.json({
        success: true,
        processed: false,
        reason: 'Phone number not found',
      });
    }

    const userId = usersSnapshot.docs[0].id;
    const userData = usersSnapshot.docs[0].data();

    // Update user preferences - unsubscribe from SMS
    await adminDb.collection('users').doc(userId).set(
      {
        preferences: {
          sms: {
            optIn: false,
            unsubscribedAt: new Date().toISOString(),
            unsubscribeMethod: 'sms_stop',
            unsubscribeMessage: message,
          },
        },
      },
      { merge: true }
    );

    // Log STOP event (legal compliance)
    await adminDb.collection('unsubscribe_events').add({
      userId,
      phoneNumber,
      type: 'sms',
      method: 'sms_stop_reply',
      message,
      providerId,
      timestamp: timestamp || new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    console.log(`User ${userId} unsubscribed from SMS via STOP reply: "${message}"`);

    return NextResponse.json({
      success: true,
      processed: true,
      userId,
      message: 'User has been unsubscribed from SMS',
    });
  } catch (error) {
    console.error('SMS STOP handler error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process STOP command' },
      { status: 500 }
    );
  }
}
