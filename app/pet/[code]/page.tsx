import PetProfileClient from '@/components/PetProfileClient'
import Link from 'next/link'

async function getPetData(code: string) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/tags/${code}`;
    const response = await fetch(firestoreUrl, { method: 'GET', next: { revalidate: 0 } });
    if (!response.ok) return null;

    const doc = await response.json();
    const fields = doc.fields;
    if (!fields || fields.isActive?.booleanValue !== true || !fields.pet?.mapValue?.fields) {
      return null;
    }

    const pet = fields.pet.mapValue.fields;
    return {
      name: pet.name?.stringValue || '',
      photo: pet.photo?.stringValue || '/api/placeholder/300/300',
      owner: pet.ownerName?.stringValue || '',
      address: pet.ownerAddress?.stringValue || '',
      phone: pet.ownerPhone?.stringValue || '',
      vet: pet.vetName?.stringValue || '',
      vetAddress: pet.vetAddress?.stringValue || '',
      allergies: pet.allergies?.stringValue || '',
      goodWithDogs: pet.goodWithDogs?.booleanValue || false,
      goodWithCats: pet.goodWithCats?.booleanValue || false,
      goodWithChildren: pet.goodWithChildren?.booleanValue || false,
    };
  } catch (err) {
    console.error('Error fetching pet data:', err);
    return null;
  }
}

export default async function PetProfilePage({
  params
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const petData = await getPetData(code.toUpperCase())

  if (!petData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Tag Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This tag hasn&apos;t been activated yet, or the code is invalid.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-400 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    )
  }

  return <PetProfileClient petData={petData} tagCode={code} />
}
