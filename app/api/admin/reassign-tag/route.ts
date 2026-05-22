import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    // Simple auth check
    if (secret !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tagCode, userEmail } = body

    if (!tagCode || !userEmail) {
      return NextResponse.json(
        { error: 'tagCode and userEmail are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const usersSnapshot = await adminDb
      .collection('users')
      .where('email', '==', userEmail)
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      return NextResponse.json(
        { error: `User with email ${userEmail} not found` },
        { status: 404 }
      )
    }

    const userId = usersSnapshot.docs[0].id

    // Get the tag
    const tagDoc = await adminDb.collection('tags').doc(tagCode.toUpperCase()).get()
    if (!tagDoc.exists) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Reassign tag to new user
    await adminDb.collection('tags').doc(tagCode.toUpperCase()).update({
      userId,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `Tag ${tagCode} reassigned to user ${userEmail} (${userId})`,
      tagCode,
      userId,
      userEmail,
    })
  } catch (error) {
    console.error('Error reassigning tag:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reassign tag' },
      { status: 500 }
    )
  }
}
