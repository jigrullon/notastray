import PetProfileClient from '@/components/PetProfileClient'

// This would normally come from a database
async function getPetData(code: string) {
  // In production, fetch from your database
  return {
    name: "Buddy",
    photo: "/api/placeholder/300/300",
    owner: "Sarah",
    address: "123 Oak Street, Portland, OR 97201",
    phone: "(555) 123-4567",
    vet: "Portland Pet Clinic - Dr. Smith",
    vetAddress: "456 Pine Ave, Portland, OR 97202",
    allergies: "Allergic to peanuts and shellfish. Takes daily heart medication (Enalapril 5mg).",
    goodWithDogs: true,
    goodWithCats: false,
    goodWithChildren: true,
  }
}

export default async function PetProfilePage({ params }: { params: { code: string } }) {
  const petData = await getPetData(params.code)
  
  return <PetProfileClient petData={petData} tagCode={params.code} />
}