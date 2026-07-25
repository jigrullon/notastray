'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Eye, Check } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'

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
  { key: 'showOwnerName', label: 'Owner name', description: 'Your name, shown to anyone who scans the tag' },
  { key: 'showPhone', label: 'Phone number', description: 'Lets a finder call you directly from the profile' },
  { key: 'showAddress', label: 'Home address', description: 'Shown as text on the profile page' },
]

export default function PetPrivacyPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const code = (params.code as string).toUpperCase()

  const [petName, setPetName] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [privacy, setPrivacy] = useState<PrivacySettings>(DEFAULT_PRIVACY)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?from=privacy&code=${code}`)
    }
  }, [user, loading, router, code])

  useEffect(() => {
    if (!user || !code) return

    const fetchTag = async () => {
      try {
        const snap = await getDoc(doc(db, 'tags', code))
        if (!snap.exists()) {
          setNotFound(true)
          return
        }
        const data = snap.data()
        if (data.userId !== user.uid) {
          setForbidden(true)
          return
        }
        setPetName(data.pet?.name || 'your pet')
        setPrivacy({
          showOwnerName: data.pet?.privacy?.showOwnerName ?? true,
          showPhone: data.pet?.privacy?.showPhone ?? true,
          showAddress: data.pet?.privacy?.showAddress ?? true,
        })
      } catch (err) {
        console.error('Failed to load tag for privacy settings:', err)
        setNotFound(true)
      } finally {
        setFetching(false)
      }
    }
    fetchTag()
  }, [user, code])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSuccessMessage('')
    try {
      // Dotted field path merges only `pet.privacy`, leaving the rest of the
      // `pet` map (name, contact info, medical notes, etc.) untouched.
      await updateDoc(doc(db, 'tags', code), {
        'pet.privacy': privacy,
        updatedAt: new Date().toISOString(),
      })
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

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Tag not found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We couldn&apos;t find a tag with that code.
          </p>
          <Link href="/dashboard" className="btn-primary inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Not your tag</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You can only manage privacy settings for tags linked to your account.
          </p>
          <Link href="/dashboard" className="btn-primary inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

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
              Privacy Sharing
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              What contact info about {petName} would you like shown when someone scans the tag?
            </p>
          </div>

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
              This only controls the public profile page. Pet details like breed, coloring, and medical
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
        </div>
      </div>
    </div>
  )
}
