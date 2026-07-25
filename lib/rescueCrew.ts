import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Contacts are capped to keep the list to genuinely close contacts and to
// prevent a client from flooding the database with unlimited entries.
// Enforced server-side in app/api/rescue-crew/route.ts — this constant is
// only used here for the client-facing error message and UI state.
export const MAX_RESCUE_CREW_CONTACTS = 5;

// --- Types ---

export type RescueCrewRelationship =
  | 'family'
  | 'neighbor'
  | 'veterinarian'
  | 'pet_sitter'
  | 'safe_place'
  | 'other';

export interface RescueCrewPhone {
  countryCode: string;
  number: string;
  type: 'mobile' | 'home' | 'work' | '';
  ext?: string;
}

export interface RescueCrewAddress {
  street: string;
  unit: string;
  city: string;
  state: string;
  postal: string;
  country: string;
}

export interface RescueCrewContact {
  id?: string;
  title: string;
  firstName: string;
  lastName: string;
  relationship: RescueCrewRelationship;
  email: string;
  phone1: RescueCrewPhone;
  phone2: RescueCrewPhone | null;
  address: RescueCrewAddress | null;
  tagCodes: string[];
  showWhenLost: boolean;
  permissionAttestedAt: string;
  createdAt: string;
  updatedAt: string;
}

// Whitelisted shape returned to the public pet profile when a pet is lost.
// Intentionally omits email, tagCodes, and timestamps.
export interface PublicRescueCrewContact {
  title: string;
  firstName: string;
  lastName: string;
  relationship: RescueCrewRelationship;
  phone1: RescueCrewPhone;
  phone2: RescueCrewPhone | null;
  address: RescueCrewAddress | null;
}

export const RELATIONSHIP_OPTIONS: { value: RescueCrewRelationship; label: string }[] = [
  { value: 'family', label: 'Family member' },
  { value: 'neighbor', label: 'Neighbor' },
  { value: 'veterinarian', label: 'Veterinarian' },
  { value: 'pet_sitter', label: 'Pet sitter' },
  { value: 'safe_place', label: 'Safe place' },
  { value: 'other', label: 'Other' },
];

// --- Client CRUD helpers (client Firebase SDK; owner-only per firestore.rules) ---

function contactsCollection(uid: string) {
  return collection(db, 'users', uid, 'rescueCrew');
}

export async function listContacts(uid: string): Promise<RescueCrewContact[]> {
  const snapshot = await getDocs(contactsCollection(uid));
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<RescueCrewContact, 'id'>),
  }));
}

// Creates go through a server API (instead of a direct client addDoc) so the
// contact cap can be enforced server-side — a direct Firestore write from the
// client couldn't be trusted to respect it.
export async function addContact(
  data: Omit<RescueCrewContact, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) {
    throw new Error('You must be signed in to add a Rescue Crew contact.');
  }

  const res = await fetch('/api/rescue-crew', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Failed to add contact');
  }
  return json.id as string;
}

export async function updateContact(
  uid: string,
  id: string,
  data: Partial<Omit<RescueCrewContact, 'id' | 'createdAt'>>
): Promise<void> {
  const ref = doc(db, 'users', uid, 'rescueCrew', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteContact(uid: string, id: string): Promise<void> {
  const ref = doc(db, 'users', uid, 'rescueCrew', id);
  await deleteDoc(ref);
}
