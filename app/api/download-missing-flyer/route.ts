import { getStorage } from 'firebase-admin/storage'
import { NextRequest, NextResponse } from 'next/server'
// Shared Admin SDK init (FIREBASE_SERVICE_ACCOUNT) — do not re-initialize here.
// This route previously used its own init with a different env-var scheme
// (FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY) and threw at module load when
// those vars were absent, which silently broke flyer downloads per-environment.
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'
import { withObservability } from '@/lib/observability/withObservability'
import { log, setRequestUser } from '@/lib/observability/logger'

export const GET = withObservability('download-missing-flyer', async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams
    const tagCode = searchParams.get('tagCode')
    const fileName = searchParams.get('fileName')

    if (!tagCode || !fileName) {
      return NextResponse.json(
        { error: 'Missing required parameters: tagCode and fileName' },
        { status: 400 }
      )
    }

    // Get the authorization token from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify the token and get user ID
    let uid: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      uid = decodedToken.uid
      setRequestUser(uid)
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Verify that the user owns this tag
    const tagDoc = await adminDb.collection('tags').doc(tagCode.toUpperCase()).get()

    if (!tagDoc.exists) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    const tagData = tagDoc.data()
    if (tagData?.userId !== uid) {
      return NextResponse.json(
        { error: 'You do not have permission to access this file' },
        { status: 403 }
      )
    }

    // Generate a signed download URL using Firebase Admin SDK.
    // Bucket must be explicit: the shared admin app sets no default bucket, and
    // relying on one made this route work or fail depending on which API route
    // happened to initialize the app first.
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    if (!storageBucket) {
      return NextResponse.json(
        { error: 'Storage bucket not configured' },
        { status: 500 }
      )
    }
    const bucket = getStorage().bucket(storageBucket)
    const filePath = `missing-pet-flyers/${tagCode}/${fileName}`
    const file = bucket.file(filePath)

    // Check if file exists
    const [exists] = await file.exists()
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Generate a signed URL valid for 1 hour
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    return NextResponse.json({
      downloadUrl: signedUrl,
      fileName,
      tagCode,
    })
  } catch (error) {
    log.error('download_missing_flyer_failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    )
  }
})
