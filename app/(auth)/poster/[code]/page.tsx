'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Loader2, AlertCircle, ArrowLeft, Download } from 'lucide-react'
import MissingPetFlyer from '@/components/MissingPetFlyer'

interface TagDoc {
  userId: string
  isActive: boolean
  isLost: boolean
  pet: Record<string, unknown>
  lostReport?: Record<string, unknown>
}

export default function PosterPage() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tagData, setTagData] = useState<TagDoc | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    async function loadTag() {
      try {
        const tagDoc = await getDoc(doc(db, 'tags', code.toUpperCase()))
        if (!tagDoc.exists()) {
          setError('Tag not found')
          return
        }
        const data = tagDoc.data() as TagDoc
        if (data.userId !== user!.uid) {
          setError('You do not have permission to view this poster')
          return
        }
        if (!data.isLost) {
          setError('This pet is not marked as lost. There is no poster to view.')
          return
        }
        setTagData(data)
      } catch (err) {
        setError('Failed to load poster')
        console.error(err)
      } finally {
        setPageLoading(false)
      }
    }

    loadTag()
  }, [user, authLoading, code, router])

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (error || !tagData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-gray-700 dark:text-gray-300">{error || 'Could not load poster'}</p>
          </div>
        </div>
      </div>
    )
  }

  const pet = tagData.pet || {}
  const lostReport = tagData.lostReport || {}
  const upperCode = code.toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Missing Pet Poster
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Download and share the poster to help find {(pet.name as string) || 'your pet'}.
          </p>
        </div>

        {/* Poster Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <MissingPetFlyer
            petName={(pet.name as string) || ''}
            species={(pet.species as string) || ''}
            gender={(pet.gender as string) || ''}
            breed={(pet.primaryBreed as string) || (pet.breed as string) || undefined}
            breedMix={(pet.breedMix as string) || undefined}
            weight={(pet.weight as string) || undefined}
            weightUnit={(pet.weightUnit as string) || 'lb'}
            photo={(pet.photo as string) || undefined}
            lastSeenDate={(lostReport.lastSeenDate as string) || ''}
            lastSeenLocation={
              lostReport.city
                ? `${lostReport.street || ''}, ${lostReport.city}, ${lostReport.state} ${lostReport.postalCode}`.trim()
                : ''
            }
            physicalDescription={(pet.physicalDescription as string) || ''}
            medicalBehavioral={(pet.medicalBehavioral as string) || ''}
            ownerName={(pet.ownerName as string) || undefined}
            ownerPhone={(pet.ownerPhone as string) || undefined}
            vetName={(pet.vetName as string) || undefined}
            vetAddress={(pet.vetAddress as string) || undefined}
            contactInfo={(lostReport.contactInfo as string) || ''}
            rewardOffered={(lostReport.rewardOffered as boolean) || false}
            tagCode={upperCode}
          />
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>💡 Tip:</strong> You can download this poster anytime by returning to this page. Share it on social media, local Facebook groups, and Nextdoor to reach more people who can help find {(pet.name as string) || 'your pet'}.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex-1 text-center px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Back to Dashboard
          </Link>
          <Link
            href={`/pet/${upperCode}`}
            className="flex-1 text-center px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors font-medium"
          >
            View Pet Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
