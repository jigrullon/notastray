import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebaseAdmin'

interface ScanEventLocation {
  latitude?: number
  longitude?: number
  accuracy?: number
  address?: string
}

interface ShapedEvent {
  id: string
  tagCode: string
  petName: string
  timestamp: string
  type: 'qr_scan' | 'profile_view'
  location: string | null
  notifiedSms: boolean
  notifiedEmail: boolean
  rateLimited: boolean
}

function formatLocation(location: ScanEventLocation | null | undefined): string | null {
  if (!location) return null
  if (location.address) return location.address
  if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    return `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`
  }
  return null
}

export async function GET(request: NextRequest) {
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
  } catch {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    )
  }

  try {
    // Resolve the caller's tag codes from their user document
    const userDoc = await adminDb.collection('users').doc(uid).get()
    const tagCodes: string[] = userDoc.exists ? (userDoc.data()?.tagCodes || []) : []

    if (tagCodes.length === 0) {
      return NextResponse.json({ events: [] })
    }

    // Batch-query scan_events in chunks of 10 (Firestore 'in' query limit).
    // No .orderBy() here — combining 'in' with orderBy on another field would
    // require a composite index that isn't deployed; we sort in memory instead.
    const allDocs: FirebaseFirestore.QueryDocumentSnapshot[] = []
    for (let i = 0; i < tagCodes.length; i += 10) {
      const batch = tagCodes.slice(i, i + 10)
      const snapshot = await adminDb
        .collection('scan_events')
        .where('tagCode', 'in', batch)
        .get()
      snapshot.forEach(doc => allDocs.push(doc))
    }

    // Sort newest-first by createdAt (fall back to timestamp), cap at 100.
    allDocs.sort((a, b) => {
      const aData = a.data()
      const bData = b.data()
      const aKey = aData.createdAt || aData.timestamp || ''
      const bKey = bData.createdAt || bData.timestamp || ''
      return bKey.localeCompare(aKey)
    })

    const events: ShapedEvent[] = allDocs.slice(0, 100).map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        tagCode: data.tagCode,
        petName: data.petName,
        timestamp: data.timestamp,
        type: data.source === 'qr' ? 'qr_scan' : 'profile_view',
        location: formatLocation(data.location),
        notifiedSms: data.notificationsSent?.sms ?? false,
        notifiedEmail: data.notificationsSent?.email ?? false,
        rateLimited: data.rateLimited ?? false,
      }
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Error fetching scan events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scan events' },
      { status: 500 }
    )
  }
}
