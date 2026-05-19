import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

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

    // Reset tag to unactivated state, clear all pet data
    await adminDb.collection('tags').doc(tagCode.toUpperCase()).set({
      isActive: false,
      userId: undefined,
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
        goodWithDogs: false,
        goodWithCats: false,
        goodWithChildren: false,
        species: '',
        breed: '',
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
