import { NextResponse, NextRequest } from 'next/server';
import { verifyBearerToken } from '@/lib/apiAuth';
import { adminDb } from '@/lib/firebaseAdmin';
import {
  MAX_RESCUE_CREW_CONTACTS,
  RELATIONSHIP_OPTIONS,
  type RescueCrewPhone,
  type RescueCrewAddress,
} from '@/lib/rescueCrew';

const RELATIONSHIP_VALUES = new Set(RELATIONSHIP_OPTIONS.map((o) => o.value));
const PHONE_TYPES = new Set(['mobile', 'home', 'work', '']);

function parsePhone(value: unknown): RescueCrewPhone | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Record<string, unknown>;
  const number = typeof p.number === 'string' ? p.number.trim() : '';
  if (!number) return null;
  const type = typeof p.type === 'string' && PHONE_TYPES.has(p.type) ? (p.type as RescueCrewPhone['type']) : '';
  return {
    countryCode: typeof p.countryCode === 'string' ? p.countryCode : '+1',
    number,
    type,
    ...(typeof p.ext === 'string' && p.ext.trim() ? { ext: p.ext.trim() } : {}),
  };
}

function parseAddress(value: unknown): RescueCrewAddress | null {
  if (!value || typeof value !== 'object') return null;
  const a = value as Record<string, unknown>;
  const str = (k: string) => (typeof a[k] === 'string' ? (a[k] as string).trim() : '');
  if (!str('street') && !str('unit') && !str('city') && !str('state') && !str('postal')) return null;
  return {
    street: str('street'),
    unit: str('unit'),
    city: str('city'),
    state: str('state'),
    postal: str('postal'),
    country: str('country') || 'United States',
  };
}

// Rescue Crew contacts are created here (Admin SDK) rather than via a direct
// client Firestore write, specifically so the per-owner contact cap below is
// actually enforced — firestore.rules disallows client-side creates on this
// subcollection for the same reason. Update/delete remain client-side since
// they can't grow the collection.
export async function POST(request: NextRequest) {
  const { decoded, error } = await verifyBearerToken(request);
  if (error) return error;
  const uid = decoded.uid;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const relationship = typeof body.relationship === 'string' ? body.relationship : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const tagCodes = Array.isArray(body.tagCodes)
    ? body.tagCodes.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : [];
  const phone1 = parsePhone(body.phone1);
  const phone2 = parsePhone(body.phone2);
  const address = parseAddress(body.address);
  const showWhenLost = Boolean(body.showWhenLost);

  if (!title || !firstName || !relationship || !RELATIONSHIP_VALUES.has(relationship as any) || !phone1 || tagCodes.length === 0) {
    return NextResponse.json({ success: false, error: 'Missing or invalid required fields' }, { status: 400 });
  }

  const contactsRef = adminDb.collection('users').doc(uid).collection('rescueCrew');
  const existing = await contactsRef.get();
  if (existing.size >= MAX_RESCUE_CREW_CONTACTS) {
    return NextResponse.json(
      {
        success: false,
        error: `You can have up to ${MAX_RESCUE_CREW_CONTACTS} Rescue Crew contacts. Remove one to add another.`,
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const docRef = await contactsRef.add({
    title,
    firstName,
    lastName,
    relationship,
    email,
    phone1,
    phone2,
    address,
    tagCodes,
    showWhenLost,
    permissionAttestedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ success: true, id: docRef.id });
}
