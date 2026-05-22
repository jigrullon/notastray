import { adminDb } from '@/lib/firebaseAdmin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - requires a secret query parameter
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.ADMIN_API_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tagCodes = ['PUZH9E', 'KSS3T3', 'K7V645']
    const petNames = ['Britt', 'Brittany', 'Brit']
    const owners = ['Sarah Johnson', 'Emily Chen', 'Jessica Martinez']
    const phones = ['(555) 123-4567', '(555) 234-5678', '(555) 345-6789']
    const addresses = ['123 Oak Street, Portland, OR 97214', '456 Maple Ave, Seattle, WA 98101', '789 Pine Ln, Vancouver, BC V5L 2K3']
    const vets = ['Happy Paws Vet Clinic', 'Gentle Care Animal Hospital', 'Riverside Veterinary']
    const vetAddresses = ['100 Vet Plaza, Portland, OR 97214', '200 Medical Dr, Seattle, WA 98101', '300 Animal Rd, Vancouver, BC V5L 2K3']

    const updates = tagCodes.map((code, index) => ({
      code,
      data: {
        isActive: true,
        isLost: false,
        userId: 'sample-tags',
        pet: {
          name: petNames[index],
          photo: '/britt-pic.jpg',
          ownerName: owners[index],
          ownerAddress: addresses[index],
          ownerPhone: phones[index],
          vetName: vets[index],
          vetAddress: vetAddresses[index],
          allergies: 'None',
          goodWithDogs: true,
          goodWithCats: true,
          goodWithChildren: true,
          species: 'Dog',
          breed: 'Golden Retriever',
        },
      },
    }))

    for (const { code, data } of updates) {
      await adminDb.collection('tags').doc(code).set(data)
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${tagCodes.length} sample tags`,
      tags: tagCodes,
    })
  } catch (error) {
    console.error('Error populating sample tags:', error)
    return NextResponse.json(
      { error: 'Failed to populate sample tags' },
      { status: 500 }
    )
  }
}
