import { NextResponse } from 'next/server'
// Shared Admin SDK init (FIREBASE_SERVICE_ACCOUNT) — bypasses Firestore rules.
import { adminDb } from '@/lib/firebaseAdmin'
import type {
  PublicRescueCrewContact,
  RescueCrewContact,
} from '@/lib/rescueCrew'

/**
 * Public GET handler for a pet's Rescue Crew contacts.
 *
 * PRIVACY GATE — this route is the ONLY path by which Rescue Crew contacts
 * reach an unauthenticated visitor, and it is deliberately locked down:
 *
 *  - Contacts live in the owner-private `users/{uid}/rescueCrew` subcollection
 *    (firestore.rules restrict direct reads to the owner). They are NEVER stored
 *    on the publicly-readable `tags/{code}` document.
 *  - Exposure is gated SERVER-SIDE on fresh Firestore data: contacts are returned
 *    only when the tag exists, `isActive === true`, and `isLost === true`. The
 *    moment an owner marks the pet found (`isLost: false`), this route returns an
 *    empty list again — a client cannot fake the lost state.
 *  - Missing tag / inactive / not-lost cases all return the SAME `{ contacts: [] }`
 *    with status 200, so the response never leaks whether a tag or contacts exist.
 *  - The payload is an explicit field-by-field whitelist (PublicRescueCrewContact).
 *    `email`, `tagCodes`, and timestamps are intentionally EXCLUDED — email is
 *    withheld to limit scraping/spam; phones are the actionable channel for finders.
 *  - Any error is swallowed and returns `{ contacts: [] }` (200): the pet profile
 *    must never break because of this feature.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const CODE = code.toUpperCase()

    // Server-side gate: read fresh tag state.
    const tagSnap = await adminDb.collection('tags').doc(CODE).get()
    if (
      !tagSnap.exists ||
      tagSnap.get('isActive') !== true ||
      tagSnap.get('isLost') !== true
    ) {
      // Do not distinguish cases — no information leak.
      return NextResponse.json({ contacts: [] })
    }

    const userId = tagSnap.get('userId') as string | undefined
    if (!userId) {
      return NextResponse.json({ contacts: [] })
    }

    // Single array-contains where avoids needing a composite index; the
    // showWhenLost opt-in is filtered in-code below.
    const contactsSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('rescueCrew')
      .where('tagCodes', 'array-contains', CODE)
      .get()

    const contacts: PublicRescueCrewContact[] = contactsSnap.docs
      .map((d) => d.data() as RescueCrewContact)
      .filter((c) => c.showWhenLost === true)
      // Explicit field-by-field whitelist. NEVER spread raw doc data — that would
      // leak email, tagCodes, and timestamps.
      .map((c) => ({
        title: c.title,
        firstName: c.firstName,
        lastName: c.lastName,
        relationship: c.relationship,
        phone1: c.phone1,
        phone2: c.phone2,
        address: c.address,
      }))

    return NextResponse.json({ contacts })
  } catch (err) {
    console.error('[Rescue Crew] Failed to load public contacts:', err)
    // The pet profile must never break because of this feature.
    return NextResponse.json({ contacts: [] })
  }
}
