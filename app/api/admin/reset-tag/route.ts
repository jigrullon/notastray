import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    // Admin-only: Verify admin API key
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;

    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tagCode } = await request.json();

    if (!tagCode) {
      return NextResponse.json({ error: 'Tag code is required' }, { status: 400 });
    }

    const upperTagCode = tagCode.toUpperCase();

    // Remove the tag from its previous owner's tagCodes array, if any,
    // so a reset tag doesn't keep showing up on the old owner's dashboard.
    const existingTagDoc = await adminDb.collection('tags').doc(upperTagCode).get();
    const previousUserId = existingTagDoc.data()?.userId;
    if (previousUserId) {
      await adminDb.collection('users').doc(previousUserId).update({
        tagCodes: FieldValue.arrayRemove(upperTagCode),
      });
    }

    // Reset tag to unactivated state, clear all pet data
    await adminDb.collection('tags').doc(upperTagCode).set({
      isActive: false,
      userId: null,
      isLost: false,
      pet: {
        name: '',
        photo: '/api/placeholder/300/300',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerAddress: '',
        vetName: '',
        vetAddress: '',
        allergies: '',
        behavioralNotes: '',
        goodWithDogs: false,
        goodWithCats: false,
        goodWithChildren: false,
        species: '',
        breed: '',
        gender: '',
        spayedNeutered: '',
        coloring: '',
      },
      resetBy: 'admin',
      resetAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Tag ${tagCode} has been reset to unactivated state`,
      tagCode: tagCode.toUpperCase(),
    });
  } catch (error) {
    console.error('Admin reset tag error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
