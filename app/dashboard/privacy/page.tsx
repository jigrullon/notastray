'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Eye, Check } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, getDocs, collection, query, where, documentId, updateDoc } from 'firebase/firestore'

interface PrivacySettings {
  showOwnerName: boolean
  showPhone: boolean
  showAddress: boolean
}

const DEFAULT_PRIVACY: PrivacySettings = {
  showOwnerName: true,
  showPhone: true,
  showAddress: true,
}

const FIELDS: { key: keyof PrivacySettings; label: string; description: string }[] = [
  { key: 'showOwnerName', label: 'Owner name', description: 'Your name, shown to anyone who scans a tag' },
  { key: 'showPhone', label: 'Phone number', description: 'Lets a finder call you directly from the profile' },
  { key: 'showAddress', label: 'Home address', description: 'Shown as text on the profile page' },
]

export default function PrivacySharingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [activeTagCodes, setActiveTagCodes] = useState<string[]>([])
  const [fetching, setFetching] = useState(true)
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?from=privacy')
    }
  }, [user, loading, router])

  // Applies to every one of the user's active tags — there's one shared
  // setting rather than a per-pet configuration.
  useEffect(() => {
    if (!user) return

    const fetchTags = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const tagCodes: string[] = userDoc.exists() ? (userDoc.data().tagCodes || []) : []
        if (tagCodes.length === 0) {
          setActiveTagCodes([])
          return
        }

        const codes: string[] = []
        let seededPrivacy: PrivacySettings | null = null
        for (let i = 0; i < tagCodes.length; i += 10) {
          const batch = tagCodes.slice(i, i + 10)
          const tagsQuery = query(collection(db, 'tags'), where(documentId(), 'in', batch))
          const snapshot = await getDocs(tagsQuery)
          snapshot.forEach((tagDoc) => {
            const data = tagDoc.data()
            if (!data.isActive) return
            codes.push(tagDoc.id)
            if (!seededPrivacy) {
              seededPrivacy = {
                showOwnerName: data.pet?.privacy?.showOwnerName ?? true,
                showPhone: data.pet?.privacy?.showPhone ?? true,
                showAddress: data.pet?.privacy?.showAddress ?? true,
              }
            }
          })
        }
        setActiveTagCodes(codes)
        if (seededPrivacy) setPrivacy(seededPrivacy)
      } catch (err) {
        console.error('Failed to load tags for privacy settings:', err)
      } finally {
        setFetching(false)
      }
    }
    fetchTags()
  }, [user])

  const handleSave = async () => {
    if (!user || activeTagCodes.length === 0) return
    setSaving(true)
    setSuccessMessage('')
    try {
      // Dotted field path merges only `pet.privacy` on each tag, leaving the
      // rest of that tag's `pet` map (name, contact info, medical notes,
      // etc.) untouched.
      await Promise.all(
        activeTagCodes.map((code) =>
          updateDoc(doc(db, 'tags', code), {
            'pet.privacy': privacy,
            updatedAt: new Date().toISOString(),
          })
        )
      )
      setSuccessMessage('Privacy settings saved.')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('Failed to save privacy settings:', err)
      alert('Failed to save privacy settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Eye className="w-6 h-6 mr-2 text-primary-600" />
              Privacy &amp; Sharing
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              What contact info would you like shown when someone scans one of your pets&apos; tags?
            </p>
          </div>

          {activeTagCodes.length === 0 ? (
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Activate a tag first to set up your pets&apos; privacy settings.
              </p>
              <Link href="/activate" className="btn-primary inline-block">
                Activate a Tag
              </Link>
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {FIELDS.map(({ key, label, description }) => (
                <label
                  key={key}
                  className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={privacy[key]}
                    onChange={(e) => setPrivacy({ ...privacy, [key]: e.target.checked })}
                    className="mt-0.5 w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                  />
                  <span>
                    <span className="block font-medium text-gray-900 dark:text-gray-100">{label}</span>
                    <span className="block text-sm text-gray-500 dark:text-gray-400">{description}</span>
                  </span>
                </label>
              ))}

              <p className="text-sm text-gray-500 dark:text-gray-400 pt-2">
                This applies to all {activeTagCodes.length > 1 ? `${activeTagCodes.length} of your active tags` : 'your active tag'} and
                only controls the public profile page. Pet details like breed, coloring, and medical
                notes always stay visible so a finder can help your pet — only your contact info is hidden.
              </p>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {successMessage && (
                  <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    {successMessage}
                  </span>
                )}
                <Link href="/dashboard" className="btn-outline">
                  Cancel
                </Link>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary px-6 py-2 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
