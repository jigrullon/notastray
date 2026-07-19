'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Phone, MapPin, Heart, AlertTriangle, Users, Dog, Cat, Baby, BellRing, CheckCircle, Edit3, Save, X, Camera, Loader2, Download, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { db, storage } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getSpecies, getBreeds } from '@/lib/breedUtils'
import { CLIENT_COOLDOWN_MS, CLIENT_COOLDOWN_LOST_MS } from '@/lib/scanNotificationConfig'

type ScanSource = 'qr' | 'lookup' | 'likely_qr' | 'unknown'

// Determines how the visitor arrived — used for notification wording and
// analytics ONLY; dedup/suppression logic must never branch on this.
// 'likely_qr' exists for the ~1,500 legacy tags printed without ?src=qr:
// a camera-initiated visit has an empty referrer, comes from a mobile device,
// and is a fresh navigation (not a reload / back-forward restore). An explicit
// ?src= param always wins, so this heuristic self-obsoletes as legacy tags
// age out of circulation.
function inferSource(): ScanSource {
  if (typeof window === 'undefined') return 'unknown'
  const srcParam = new URLSearchParams(window.location.search).get('src')
  if (srcParam === 'qr' || srcParam === 'lookup') return srcParam
  try {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const freshNavigation = !navEntry || navEntry.type === 'navigate'
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    if (!document.referrer && isMobile && freshNavigation) return 'likely_qr'
  } catch {
    // Navigation Timing unavailable — treat as unknown
  }
  return 'unknown'
}

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}

// Format a YYYY-MM-DD birthday for display, with an approximate age.
function formatBirthday(birthday: string): string {
  if (!birthday) return ''
  const date = new Date(`${birthday}T00:00:00`)
  if (isNaN(date.getTime())) return birthday
  const formatted = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const now = new Date()
  let age = now.getFullYear() - date.getFullYear()
  const monthDiff = now.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age--
  }
  if (age < 0) return formatted
  return `${formatted} (${age} ${age === 1 ? 'year' : 'years'} old)`
}

interface PetData {
  name: string
  photo: string
  birthday: string
  owner: string
  address: string
  phone: string
  vet: string
  vetAddress: string
  allergies: string
  goodWithDogs: 'yes' | 'no' | 'unsure'
  goodWithCats: 'yes' | 'no' | 'unsure'
  goodWithChildren: 'yes' | 'no' | 'unsure'
}

interface PetProfileClientProps {
  petData: PetData
  tagCode: string
  userId?: string
  isLost?: boolean
  species?: string
  breed?: string
}

export default function PetProfileClient({ petData, tagCode, userId, isLost, species, breed }: PetProfileClientProps) {
  const { user, loading } = useAuth()
  const isOwner = !!(user && userId && user.uid === userId)

  // Notification flow state:
  //  'idle'       – nothing sent or decided yet
  //  'sent'       – server confirmed a notification went out (green banner)
  //  'suppressed' – client-side guard skipped auto-notify (amber banner + Alert Owner Again)
  //  'already'    – server said the owner was alerted recently (amber banner, no button)
  const [notifyState, setNotifyState] = useState<'idle' | 'sent' | 'suppressed' | 'already'>('idle')
  const [manualSending, setManualSending] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({ ...petData })
  const [editSpecies, setEditSpecies] = useState(species || '')
  const [editBreed, setEditBreed] = useState(breed || '')
  const [saving, setSaving] = useState(false)
  const [lostStatus, setLostStatus] = useState(isLost || false)
  const [reportedFound, setReportedFound] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Auto-notify on mount — guarded so lingering-tab restores and repeat
  // visits don't spam the owner. Every guard fails open: a duplicate alert
  // beats a missed alert for a lost pet.
  useEffect(() => {
    // Wait until auth has finished loading before sending notifications
    // This prevents notifications from being sent before we can check if user is owner
    if (loading) return

    // Don't notify when owner views their own pet
    if (isOwner) return

    // Layer 1: reload detection. A restored/reloaded tab (mobile browsers
    // discard and reload background tabs) is not a new scan — only a fresh
    // navigation (QR scan, lookup, typed URL) should auto-notify.
    try {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (navEntry && navEntry.type !== 'navigate') {
        setNotifyState('suppressed')
        return
      }
    } catch {
      // Navigation Timing unavailable — fail open
    }

    // Layer 2: durable cooldown. localStorage survives tab discard/restore
    // (unlike sessionStorage). Timestamp is written only after a confirmed send.
    try {
      const last = localStorage.getItem(`scan_notified_${tagCode}`)
      if (last) {
        const cooldownMs = isLost ? CLIENT_COOLDOWN_LOST_MS : CLIENT_COOLDOWN_MS
        if (Date.now() - new Date(last).getTime() < cooldownMs) {
          setNotifyState('suppressed')
          return
        }
      }
    } catch {
      // Private-mode storage errors — fail open
    }

    sendNotification(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagCode, isOwner, loading])

  // Resolve GPS location as a promise so the whole notify flow is awaitable
  // (needed for the manual Alert Owner Again button's pending state).
  const getBrowserLocation = (): Promise<LocationData | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
        (error) => {
          console.log('Location error:', error.message)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })

  const sendNotification = async (manual: boolean) => {
    try {
      const source = inferSource()
      const gpsLocation = await getBrowserLocation()

      if (gpsLocation) {
        // Try to get address from coordinates
        try {
          const response = await fetch(`/api/geocode?lat=${gpsLocation.latitude}&lng=${gpsLocation.longitude}`)
          if (response.ok) {
            const data = await response.json()
            gpsLocation.address = data.address
          }
        } catch {
          console.log('Geocoding failed, using coordinates only')
        }

        setLocation(gpsLocation)
        await postNotification({ location: gpsLocation, source, manual })
      } else {
        // GPS denied/unavailable — fall back to approximate IP-based location
        let ipLocation: LocationData | null = null
        try {
          const ipResponse = await fetch('/api/ip-location')
          if (ipResponse.ok) {
            ipLocation = await ipResponse.json()
          }
        } catch {
          // Proceed without location — notification still goes out
        }
        await postNotification({ location: ipLocation, source, manual, locationMethod: 'ip' })
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }

  const postNotification = async (payload: {
    location: LocationData | null
    source: ScanSource
    manual: boolean
    locationMethod?: 'gps' | 'ip'
  }) => {
    try {
      const response = await fetch('/api/notify-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagCode: tagCode,
          location: payload.location,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          ...(payload.locationMethod && { locationMethod: payload.locationMethod }),
          source: payload.source,
          manual: payload.manual,
        }),
      })

      if (!response.ok) return
      const data = await response.json().catch(() => null)

      if (data?.status === 'sent') {
        setNotifyState('sent')
        // Start the client cooldown only after a confirmed send
        try {
          localStorage.setItem(`scan_notified_${tagCode}`, new Date().toISOString())
        } catch {
          // Private mode — ignore
        }
      } else if (data?.status === 'deduped' || data?.status === 'rate_limited') {
        // Server suppressed the send — never show the green banner for this
        setNotifyState('already')
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }

  // Manual re-alert: bypasses the client-side guards above, but the server's
  // per-visitor cooldown and per-tag rate limit still apply.
  const handleManualAlert = async () => {
    if (manualSending) return
    setManualSending(true)
    try {
      await sendNotification(true)
    } finally {
      setManualSending(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    let photoUrl = editData.photo
    let photoError = false

    // Upload new photo if one was selected — isolated so a storage failure
    // doesn't block saving the rest of the profile.
    if (photoFile) {
      try {
        const storageRef = ref(storage, `pet-photos/${tagCode.toUpperCase()}/${Date.now()}-${photoFile.name}`)

        // Race the upload against a 30-second timeout so it fails fast
        // instead of spinning indefinitely if storage is unreachable.
        const uploadTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Photo upload timed out')), 30000)
        )
        await Promise.race([uploadBytes(storageRef, photoFile), uploadTimeout])
        photoUrl = await getDownloadURL(storageRef)
      } catch (photoErr) {
        console.error('Photo upload failed:', photoErr)
        photoError = true
        // Keep existing photo URL so the rest of the profile still saves.
      }
    }

    try {
      const upperCode = tagCode.toUpperCase()
      await updateDoc(doc(db, 'tags', upperCode), {
        pet: {
          name: editData.name,
          photo: photoUrl,
          birthday: editData.birthday,
          ownerName: editData.owner,
          ownerAddress: editData.address,
          ownerPhone: editData.phone,
          vetName: editData.vet,
          vetAddress: editData.vetAddress,
          allergies: editData.allergies,
          goodWithDogs: editData.goodWithDogs,
          goodWithCats: editData.goodWithCats,
          goodWithChildren: editData.goodWithChildren,
          species: editSpecies,
          breed: editBreed,
        },
        updatedAt: new Date().toISOString(),
      })

      if (photoError) {
        alert('Profile saved, but the photo could not be uploaded. Please try changing the photo again.')
        setPhotoFile(null)
        setPhotoPreview(null)
        setEditing(false)
        setSaving(false)
      } else {
        window.location.reload()
      }
    } catch (err) {
      console.error('Error saving profile:', err)
      alert('Failed to save changes. Please try again.')
      setSaving(false)
    }
  }

  const handleToggleLost = async () => {
    try {
      const newStatus = !lostStatus
      await updateDoc(doc(db, 'tags', tagCode.toUpperCase()), {
        isLost: newStatus,
        ...(newStatus ? { lostAt: new Date().toISOString() } : { lostAt: null }),
        updatedAt: new Date().toISOString(),
      })
      setLostStatus(newStatus)
    } catch (err) {
      console.error('Error toggling lost status:', err)
    }
  }

  const handleReportFound = async () => {
    try {
      await updateDoc(doc(db, 'tags', tagCode.toUpperCase()), {
        foundReports: arrayUnion({
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
        }),
      })
      setReportedFound(true)
    } catch (err) {
      console.error('Error reporting found:', err)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Notification Status */}
        {notifyState === 'sent' && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <div>
                <p className="text-green-800 dark:text-green-300 font-medium">Owner has been notified!</p>
                <p className="text-green-700 dark:text-green-400 text-sm">
                  {location
                    ? `Location shared: ${location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}`
                    : 'Approximate location shared'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
        {notifyState === 'suppressed' && !isOwner && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center">
                <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
                <p className="text-amber-800 dark:text-amber-300 font-medium">
                  The owner was recently alerted about this pet.
                </p>
              </div>
              <button
                onClick={handleManualAlert}
                disabled={manualSending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50"
              >
                {manualSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />}
                {manualSending ? 'Alerting...' : 'Alert Owner Again'}
              </button>
            </div>
          </div>
        )}
        {notifyState === 'already' && !isOwner && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <BellRing className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2 flex-shrink-0" />
              <p className="text-amber-800 dark:text-amber-300 font-medium">
                The owner has already been alerted recently — thank you for helping!
              </p>
            </div>
          </div>
        )}

        {/* Header Alert - conditional based on lost status and ownership */}
        {lostStatus && !isOwner && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" />
              <p className="text-amber-800 dark:text-amber-300 font-medium">
                Found Pet Alert - Please help reunite this pet with their family
              </p>
            </div>
          </div>
        )}
        {isOwner && lostStatus && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <p className="text-blue-800 dark:text-blue-300 font-medium">
                Your pet is marked as lost. Click Report Found below when they&apos;re back safe.
              </p>
            </div>
          </div>
        )}

        {/* Back to Dashboard (owner only) */}
        {isOwner && (
          <div className="mb-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Owner Controls */}
        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">This is your pet</span>
            <div className="flex flex-wrap gap-2">
              {editing ? (
                <>
                  <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Changes
                  </button>
                  <button onClick={() => { setEditing(false); setEditData({ ...petData }); setEditSpecies(species || ''); setEditBreed(breed || ''); setPhotoFile(null); setPhotoPreview(null); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                  {lostStatus ? (
                    <>
                      <Link href={`/poster/${tagCode}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Download Poster
                      </Link>
                      <button onClick={handleToggleLost} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 transition-colors">
                        Report Found
                      </button>
                    </>
                  ) : (
                    <Link href={`/report-lost/${tagCode}`} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 transition-colors">
                      Report Lost
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}


        {/* Pet Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          {/* Pet Photo and Basic Info */}
          <div className="p-6 text-center border-b border-gray-200 dark:border-gray-700">
            <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 overflow-hidden relative">
              {editing ? (
                <>
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : petData.photo && petData.photo !== '/api/placeholder/300/300' && petData.photo !== '' ? (
                    <img src={petData.photo} alt={petData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">{petData.name.charAt(0)}</span>
                    </div>
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer opacity-0 hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </label>
                </>
              ) : (
                <>
                  {petData.photo && petData.photo !== '/api/placeholder/300/300' && petData.photo !== '' ? (
                    <img src={petData.photo} alt={petData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-white text-4xl font-bold">{petData.name.charAt(0)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {editing ? (
              <>
                <input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className={`${inputClass} text-center text-2xl font-bold mb-2`}
                  placeholder="Pet name"
                />
                <div className="flex gap-2 justify-center">
                  <select
                    value={editSpecies}
                    onChange={(e) => {
                      setEditSpecies(e.target.value)
                      setEditBreed('')
                    }}
                    className={`${inputClass} text-center text-sm`}
                  >
                    <option value="">Select Species</option>
                    {getSpecies().map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {editSpecies === 'Other' ? (
                    <input
                      value={editBreed}
                      onChange={(e) => setEditBreed(e.target.value)}
                      className={`${inputClass} text-center text-sm`}
                      placeholder="Specify (e.g. Ferret)"
                    />
                  ) : editSpecies && ['Dog', 'Cat'].includes(editSpecies) ? (
                    <select
                      value={editBreed}
                      onChange={(e) => setEditBreed(e.target.value)}
                      className={`${inputClass} text-center text-sm`}
                    >
                      <option value="">Select Breed</option>
                      {getBreeds(editSpecies).map((breed) => (
                        <option key={breed} value={breed}>
                          {breed}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={editBreed}
                      onChange={(e) => setEditBreed(e.target.value)}
                      className={`${inputClass} text-center text-sm`}
                      placeholder="Breed"
                      disabled
                    />
                  )}
                </div>
                <div className="mt-3 max-w-xs mx-auto">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Birthday</label>
                  <input
                    type="date"
                    value={editData.birthday}
                    onChange={(e) => setEditData({ ...editData, birthday: e.target.value })}
                    className={`${inputClass} text-center text-sm`}
                  />
                </div>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{petData.name}</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {species && breed ? `${species} \u2022 ${breed}` : species || breed || ''}
                </p>
                {petData.birthday && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Birthday: {formatBirthday(petData.birthday)}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Contact Information */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-primary-600" />
              Contact Owner
            </h2>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Owner Name</label>
                  <input
                    value={editData.owner}
                    onChange={(e) => setEditData({ ...editData, owner: e.target.value })}
                    className={inputClass}
                    placeholder="Owner name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    value={editData.phone}
                    onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    className={inputClass}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <input
                    value={editData.address}
                    onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                    className={inputClass}
                    placeholder="Address"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">{petData.owner}</span>
                  {petData.phone ? (
                    <a
                      href={`tel:${petData.phone}`}
                      className="btn-primary"
                    >
                      Call Now
                    </a>
                  ) : (
                    <button
                      disabled
                      className="btn-primary opacity-50 cursor-not-allowed"
                    >
                      Call Now
                    </button>
                  )}
                </div>

                {petData.address && (
                  <div className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{petData.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medical Information */}
          {(editing || petData.allergies) && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-500" />
                Medical Information
              </h2>
              {editing ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Allergies</label>
                  <textarea
                    value={editData.allergies}
                    onChange={(e) => setEditData({ ...editData, allergies: e.target.value })}
                    className={`${inputClass} resize-none`}
                    rows={3}
                    placeholder="List any allergies or medical conditions"
                  />
                </div>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-300">{petData.allergies}</p>
                </div>
              )}
            </div>
          )}

          {/* Veterinarian */}
          {(editing || petData.vet) && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Veterinarian Clinic</h2>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Veterinarian Clinic</label>
                    <input
                      value={editData.vet}
                      onChange={(e) => setEditData({ ...editData, vet: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. Springfield Animal Hospital"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Clinic Address</label>
                    <input
                      value={editData.vetAddress}
                      onChange={(e) => setEditData({ ...editData, vetAddress: e.target.value })}
                      className={inputClass}
                      placeholder="Veterinarian address"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-700 dark:text-gray-300 font-medium">{petData.vet}</p>
                  {petData.vetAddress && (
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{petData.vetAddress}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Temperament */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary-600" />
              Temperament
            </h2>
            {editing ? (
              <div className="space-y-4">
                {/* Good with Dogs */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Dog className="w-4 h-4 mr-2 text-gray-500" />
                    Good with dogs?
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithDogs" value="yes" checked={editData.goodWithDogs === 'yes'} onChange={(e) => setEditData({ ...editData, goodWithDogs: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithDogs" value="no" checked={editData.goodWithDogs === 'no'} onChange={(e) => setEditData({ ...editData, goodWithDogs: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">No</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithDogs" value="unsure" checked={editData.goodWithDogs === 'unsure'} onChange={(e) => setEditData({ ...editData, goodWithDogs: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">Unsure</span>
                    </label>
                  </div>
                </div>

                {/* Good with Cats */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Cat className="w-4 h-4 mr-2 text-gray-500" />
                    Good with cats?
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithCats" value="yes" checked={editData.goodWithCats === 'yes'} onChange={(e) => setEditData({ ...editData, goodWithCats: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithCats" value="no" checked={editData.goodWithCats === 'no'} onChange={(e) => setEditData({ ...editData, goodWithCats: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">No</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithCats" value="unsure" checked={editData.goodWithCats === 'unsure'} onChange={(e) => setEditData({ ...editData, goodWithCats: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">Unsure</span>
                    </label>
                  </div>
                </div>

                {/* Good with Children */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Baby className="w-4 h-4 mr-2 text-gray-500" />
                    Good with children?
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithChildren" value="yes" checked={editData.goodWithChildren === 'yes'} onChange={(e) => setEditData({ ...editData, goodWithChildren: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithChildren" value="no" checked={editData.goodWithChildren === 'no'} onChange={(e) => setEditData({ ...editData, goodWithChildren: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">No</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="goodWithChildren" value="unsure" checked={editData.goodWithChildren === 'unsure'} onChange={(e) => setEditData({ ...editData, goodWithChildren: e.target.value as 'yes' | 'no' | 'unsure' })} className="w-4 h-4 text-primary-600" />
                      <span className="text-gray-700 dark:text-gray-300">Unsure</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Good with Dogs */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Dog className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">Good with dogs</span>
                  </div>
                  {petData.goodWithDogs === 'yes' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium">Yes</span>}
                  {petData.goodWithDogs === 'no' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium">No</span>}
                  {petData.goodWithDogs === 'unsure' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium">Unsure</span>}
                </div>

                {/* Good with Cats */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Cat className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">Good with cats</span>
                  </div>
                  {petData.goodWithCats === 'yes' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium">Yes</span>}
                  {petData.goodWithCats === 'no' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium">No</span>}
                  {petData.goodWithCats === 'unsure' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium">Unsure</span>}
                </div>

                {/* Good with Children */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Baby className="w-5 h-5 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">Good with children</span>
                  </div>
                  {petData.goodWithChildren === 'yes' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium">Yes</span>}
                  {petData.goodWithChildren === 'no' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium">No</span>}
                  {petData.goodWithChildren === 'unsure' && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 font-medium">Unsure</span>}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              {!isOwner && (
                petData.phone ? (
                  <a href={`tel:${petData.phone}`} className="btn-primary flex-1 text-center py-3">
                    Call Owner Now
                  </a>
                ) : (
                  <button disabled className="btn-primary flex-1 text-center py-3 opacity-50 cursor-not-allowed">
                    Call Owner Now
                  </button>
                )
              )}
              {isOwner && !editing && (
                lostStatus ? (
                  <button onClick={handleToggleLost} className="flex-1 py-3 rounded-lg font-medium bg-green-600 hover:bg-green-500 text-white transition-colors">
                    Mark as Found
                  </button>
                ) : (
                  <Link href={`/report-lost/${tagCode}`} className="flex-1 py-3 rounded-lg font-medium bg-red-600 hover:bg-red-500 text-white transition-colors text-center block">
                    Report Lost
                  </Link>
                )
              )}
              {!isOwner && (reportedFound ? (
                <div className="flex-1 py-3 text-center text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg font-medium">
                  Thank you! The owner has been notified.
                </div>
              ) : (
                <button onClick={handleReportFound} className="btn-outline flex-1 py-3">
                  Report Found
                </button>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Tag ID: {tagCode} &bull; Powered by NotAStray
            </p>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Found a pet? Here&apos;s how to help:</h3>
          <ul className="text-blue-800 dark:text-blue-300 text-sm space-y-1">
            <li>&bull; Keep the pet safe and secure</li>
            <li>&bull; Call the owner using the number above</li>
            <li>&bull; If no answer, try texting or calling again later</li>
            <li>&bull; Consider taking the pet to the listed veterinarian</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
