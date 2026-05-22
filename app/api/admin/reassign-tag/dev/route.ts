import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'

// Dev-only endpoint for reassigning tags during development
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  try {
    const body = await request.json()
    const { tagCode, userId } = body

    if (!tagCode || !userId) {
      return NextResponse.json(
        { error: 'tagCode and userId are required' },
        { status: 400 }
      )
    }

    // Get the tag to verify it exists
    const tagDoc = await adminDb.collection('tags').doc(tagCode.toUpperCase()).get()
    if (!tagDoc.exists) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    const upperTagCode = tagCode.toUpperCase()

    // Reassign tag to user
    await adminDb.collection('tags').doc(upperTagCode).update({
      userId,
      updatedAt: new Date().toISOString(),
    })

    // Add tag code to user's tagCodes array
    await adminDb.collection('users').doc(userId).update({
      tagCodes: FieldValue.arrayUnion(upperTagCode),
    })

    return NextResponse.json({
      success: true,
      message: `Tag ${upperTagCode} reassigned to user ${userId}`,
      tagCode: upperTagCode,
      userId,
    })
  } catch (error) {
    console.error('Error reassigning tag:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reassign tag' },
      { status: 500 }
    )
  }
}
