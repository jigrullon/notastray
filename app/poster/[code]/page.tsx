'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import MissingPetFlyer from '@/components/MissingPetFlyer'
import Link from 'next/link'

interface TagDoc {
  userId: string
  isActive: boolean
  isLost: boolean
  pet: Record<string, any>
}

export default function PosterPage() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tagData, setTagData] = useState<TagDoc | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    if (authLoading) return

    async function loadTag() {
      try {
        const tagDoc = await getDoc(doc(db, 'tags', code.toUpperCase()))
        if (!tagDoc.exists()) {
          setError('Tag not found')
          setLoading(false)
          return
        }

        const data = tagDoc.data() as TagDoc
        if (!data.isActive || !data.isLost) {
          setError('This pet is not marked as lost')
          setLoading(false)
          return
        }

        setTagData(data)
        setIsOwner(user?.uid === data.userId)
        setLoading(false)
      } catch (err) {
        console.error('Error loading tag:', err)
        setError('Failed to load poster')
        setLoading(false)
      }
    }

    loadTag()
  }, [code, user, authLoading])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (error || !tagData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'Poster not found'}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const pet = tagData.pet
  const lastSeenLocation = pet.lastSeenLocation || pet.location || ''
  const lastSeenDate = pet.lastSeenDate || ''

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          {isOwner && (
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          )}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Missing Pet Poster</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isOwner ? 'You can view and download this poster anytime' : 'If you have information about this pet, please contact the owner'}
          </p>
        </div>

        {/* Poster Component */}
        <MissingPetFlyer
          petName={pet.name || ''}
          species={pet.species || 'Pet'}
          gender={pet.gender || ''}
          breed={pet.breed || pet.primaryBreed || ''}
          breedMix={pet.breedMix || ''}
          weight={pet.weight || ''}
          weightUnit={pet.weightUnit || 'lb'}
          photo={pet.photo || ''}
          lastSeenDate={lastSeenDate}
          lastSeenLocation={lastSeenLocation}
          physicalDescription={pet.physicalDescription || ''}
          medicalBehavioral={pet.allergies || pet.medicalBehavioral || ''}
          ownerName={pet.ownerName || ''}
          ownerPhone={pet.ownerPhone || ''}
          vetName={pet.vetName || ''}
          vetAddress={pet.vetAddress || ''}
          contactInfo={pet.contactInfo || ''}
          rewardOffered={pet.rewardOffered || false}
          tagCode={code.toUpperCase()}
          isOwner={isOwner}
        />

        {/* Owner-only actions */}
        {isOwner && (
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-center">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              You can share this page with others to help find your pet. The download button is visible only to you.
            </p>
          </div>
        )}

        {/* View pet profile button - Owner only */}
        {isOwner && (
          <div className="mt-6 text-center">
            <Link href={`/pet/${code}`} className="inline-flex items-center gap-2 px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium rounded-lg transition-colors">
              View Pet Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
