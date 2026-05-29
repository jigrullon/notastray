import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { NextRequest, NextResponse } from 'next/server'

if (!getApps().length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  initializeApp({
    credential: cert(serviceAccount as any),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
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
      const decodedToken = await getAuth().verifyIdToken(token)
      uid = decodedToken.uid
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Parse FormData
    const formData = await request.formData()
    const tagCode = formData.get('tagCode') as string
    const fileName = formData.get('fileName') as string
    const pdfFile = formData.get('pdf') as File

    if (!tagCode || !fileName || !pdfFile) {
      return NextResponse.json(
        { error: 'Missing required fields: tagCode, fileName, pdf' },
        { status: 400 }
      )
    }

    // Verify that the user owns this tag
    const db = getFirestore()
    const tagDoc = await db.collection('tags').doc(tagCode.toUpperCase()).get()

    if (!tagDoc.exists) {
      return NextResponse.json(
        { error: 'Tag not found' },
        { status: 404 }
      )
    }

    const tagData = tagDoc.data()
    if (tagData?.userId !== uid) {
      return NextResponse.json(
        { error: 'You do not have permission to upload files for this tag' },
        { status: 403 }
      )
    }

    // Convert File to buffer
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer())

    // Upload to Firebase Storage using admin SDK
    const bucket = getStorage().bucket()
    const filePath = `missing-pet-flyers/${tagCode}/${fileName}`
    const file = bucket.file(filePath)

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
      },
    })

    // Generate a signed download URL valid for 1 hour
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    return NextResponse.json({
      success: true,
      downloadUrl: signedUrl,
      fileName,
      tagCode,
    })
  } catch (error) {
    console.error('Error uploading PDF:', error)
    return NextResponse.json(
      { error: 'Failed to upload PDF' },
      { status: 500 }
    )
  }
}
