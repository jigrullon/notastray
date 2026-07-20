import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

export async function addContact(
  uid: string,
  data: Omit<RescueCrewContact, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(contactsCollection(uid), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
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
