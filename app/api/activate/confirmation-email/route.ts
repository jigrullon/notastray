import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';
import { getActivationConfirmationEmail } from '@/lib/emailTemplates';
import { withObservability } from '@/lib/observability/withObservability';
import { log, setRequestUser } from '@/lib/observability/logger';

export const POST = withObservability('activate-confirmation-email', async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      setRequestUser(decodedToken.uid);
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const { tagCode } = await request.json();
    if (!tagCode) {
      return NextResponse.json({ error: 'tagCode is required' }, { status: 400 });
    }

    const tagDoc = await adminDb.collection('tags').doc(tagCode.toUpperCase()).get();
    if (!tagDoc.exists) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    const tagData = tagDoc.data();
    if (!tagData?.isActive || tagData.userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'You do not own this tag' }, { status: 403 });
    }

    const userEmail = decodedToken.email;
    if (!userEmail) {
      return NextResponse.json({ success: true, skipped: 'No email on account' });
    }

    const emailData = getActivationConfirmationEmail({
      customerName: decodedToken.name || tagData.pet?.ownerName || undefined,
      petName: tagData.pet?.name || 'Your pet',
      tagCode: tagCode.toUpperCase(),
      petSpecies: tagData.pet?.species || undefined,
      petPhotoUrl: tagData.pet?.photo || undefined,
      dashboardUrl: `${new URL(request.url).origin}/dashboard`,
      userEmail,
    });

    await sendEmail({
      to: userEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('activation_confirmation_email_failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to send confirmation email' }, { status: 500 });
  }
})
