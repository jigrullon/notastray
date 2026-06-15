import { NextResponse, NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendEmail } from '@/lib/sendEmail';
import { getActivationConfirmationEmail } from '@/lib/emailTemplates';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '15 m'), // 10 activation attempts per 15 minutes per IP
  analytics: false,
});

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'anonymous';
    const { success } = await ratelimit.limit(`activate:${ip}`);

    if (!success) {
      return NextResponse.json(
        { error: 'Too many activation attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const {
      tagCode,
      userId,
      userEmail,
      petName,
      petSpecies,
      petBreed,
      ownerName,
      ownerAddress,
      ownerPhone,
      ownerEmail: ownerEmailField,
      vetName,
      vetAddress,
      allergies,
      goodWithDogs,
      goodWithCats,
      goodWithChildren,
      photoUrl,
    } = await request.json();

    if (!tagCode || !userId || !petName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate tag exists and isn't already activated
    const tagDoc = await adminDb.collection('tags').doc(tagCode.toUpperCase()).get();
    if (!tagDoc.exists) {
      return NextResponse.json({ error: 'Tag code not found' }, { status: 404 });
    }

    const tagData = tagDoc.data();
    if (tagData?.isActive && !tagData?.isTestTag) {
      return NextResponse.json(
        { error: 'This tag has already been activated' },
        { status: 409 }
      );
    }

    // Activate the tag
    await adminDb.collection('tags').doc(tagCode.toUpperCase()).set({
      isActive: true,
      userId,
      isLost: false,
      activatedAt: new Date().toISOString(),
      pet: {
        name: petName,
        species: petSpecies || '',
        breed: petBreed || '',
        photo: photoUrl || '/api/placeholder/300/300',
        ownerName,
        ownerEmail: ownerEmailField || userEmail,
        ownerAddress,
        ownerPhone,
        vetName,
        vetAddress,
        allergies,
        goodWithDogs: goodWithDogs || 'unsure',
        goodWithCats: goodWithCats || 'unsure',
        goodWithChildren: goodWithChildren || 'unsure',
      },
    });

    // Send confirmation email if user email is available
    if (userEmail) {
      try {
        const emailData = getActivationConfirmationEmail({
          customerName: ownerName,
          petName,
          tagCode: tagCode.toUpperCase(),
          petSpecies,
          petPhotoUrl: photoUrl,
          dashboardUrl: 'https://notastray.com/dashboard',
        });

        await sendEmail({
          to: userEmail,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        });
      } catch (emailError) {
        console.error('Failed to send activation confirmation email:', emailError);
        // Don't fail the response if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tag activated successfully',
      tagCode: tagCode.toUpperCase(),
    });
  } catch (error) {
    console.error('Activation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Activation failed' },
      { status: 500 }
    );
  }
}
