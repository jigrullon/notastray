'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import { db, storage } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import {
  Loader2, AlertCircle, ArrowLeft, Check, Camera, Upload,
  MapPin, Calendar, Phone, AlertTriangle,
} from 'lucide-react'
import MissingPetFlyer from '@/components/MissingPetFlyer'

interface TagDoc {
  userId: string
  isActive: boolean
  isLost: boolean
  pet: Record<string, unknown>
}

interface ProfileState {
  name: string
  photo: File | null
  photoUrl: string
  species: string
  gender: string
  altered: boolean
  primaryBreed: string
  breedMix: string
  weight: string
  weightUnit: string
  microchipId: string
  rabiesTag: string
  license: string
  birthday: string
  physicalDescription: string
  medicalBehavioral: string
}

interface ReportState {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  lastSeenDate: string
  contactInfo: string
  rewardOffered: boolean
  reportTitle: string
}

export default function ReportLostPage() {
  const params = useParams()
  const code = params.code as string
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState(0)
  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagData, setTagData] = useState<TagDoc | null>(null)

  const [profile, setProfile] = useState<ProfileState>({
    name: '', photo: null, photoUrl: '',
    species: '', gender: '', altered: false,
    primaryBreed: '', breedMix: '',
    weight: '', weightUnit: 'lb',
    microchipId: '', rabiesTag: '', license: '', birthday: '',
    physicalDescription: '', medicalBehavioral: '',
  })

  const [report, setReport] = useState<ReportState>({
    street: '', city: '', state: '', postalCode: '',
    country: 'United States', lastSeenDate: '',
    contactInfo: '', rewardOffered: false, reportTitle: '',
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }

    async function loadTag() {
      try {
        const tagDoc = await getDoc(doc(db, 'tags', code.toUpperCase()))
        if (!tagDoc.exists() || !tagDoc.data().isActive) {
          router.push('/dashboard')
          return
        }
        const data = tagDoc.data() as TagDoc
        if (data.userId !== user!.uid) {
          router.push('/dashboard')
          return
        }
        setTagData(data)
        const pet = data.pet || {}
        setProfile({
          name: (pet.name as string) || '',
          photo: null,
          photoUrl: (pet.photo as string) || '',
          species: (pet.species as string) || '',
          gender: (pet.gender as string) || '',
          altered: (pet.altered as boolean) || false,
          primaryBreed: (pet.primaryBreed as string) || (pet.breed as string) || '',
          breedMix: (pet.breedMix as string) || '',
          weight: (pet.weight as string) || '',
          weightUnit: (pet.weightUnit as string) || 'lb',
          microchipId: (pet.microchipId as string) || '',
          rabiesTag: (pet.rabiesTag as string) || '',
          license: (pet.license as string) || '',
          birthday: (pet.birthday as string) || '',
          physicalDescription: (pet.physicalDescription as string) || '',
          medicalBehavioral: (pet.medicalBehavioral as string) || (pet.allergies as string) || '',
        })
        setReport(prev => ({
          ...prev,
          contactInfo: (pet.ownerPhone as string) || '',
          reportTitle: `Missing ${pet.species || 'Pet'}! Answers to '${pet.name || ''}'`.slice(0, 20),
        }))
      } catch {
        router.push('/dashboard')
      } finally {
        setPageLoading(false)
      }
    }

    loadTag()
  }, [user, authLoading, code, router])

  const petName = profile.name || 'your pet'
  const upperCode = code.toUpperCase()

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setProfile(prev => ({ ...prev, photo: file }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let photoUrl = profile.photoUrl
      if (profile.photo) {
        try {
          const storageRef = ref(storage, `pet-photos/${upperCode}/${Date.now()}-${profile.photo.name}`)
          await uploadBytes(storageRef, profile.photo)
          photoUrl = await getDownloadURL(storageRef)
        } catch (photoErr) {
          console.error('Photo upload failed:', photoErr)
          // Continue without new photo
        }
      }

      const tagRef = doc(db, 'tags', upperCode)
      await updateDoc(tagRef, {
        'pet.name': profile.name,
        'pet.photo': photoUrl,
        'pet.species': profile.species,
        'pet.gender': profile.gender,
        'pet.altered': profile.altered,
        'pet.primaryBreed': profile.primaryBreed,
        'pet.breed': profile.primaryBreed,
        'pet.breedMix': profile.breedMix,
        'pet.weight': profile.weight,
        'pet.weightUnit': profile.weightUnit,
        'pet.microchipId': profile.microchipId,
        'pet.rabiesTag': profile.rabiesTag,
        'pet.license': profile.license,
        'pet.birthday': profile.birthday,
        'pet.physicalDescription': profile.physicalDescription,
        'pet.medicalBehavioral': profile.medicalBehavioral,
        isLost: true,
        lostAt: new Date().toISOString(),
        lostReport: {
          street: report.street,
          city: report.city,
          state: report.state,
          postalCode: report.postalCode,
          country: report.country,
          lastSeenDate: report.lastSeenDate,
          contactInfo: report.contactInfo,
          rewardOffered: report.rewardOffered,
          reportTitle: report.reportTitle,
          reportedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      })
      setStep(4)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Report submission failed:', errorMsg, err)
      setError(`Failed to submit report: ${errorMsg}`)
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400'
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

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

        {/* Progress bar (steps 1–3 only) */}
        {step >= 1 && step <= 3 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Step {step} of 3</span>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Step 0: Intro ── */}
        {step === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                File a Missing Pet Report
              </h1>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mt-4 mb-6">
              We know reporting <span className="font-semibold text-gray-800 dark:text-gray-200">{petName}</span> as missing is stressful — we&apos;re going to help you every step of the way.
              It only takes 3 steps, and we&apos;ll use the profile information you&apos;ve already set up.
            </p>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-5 mb-8">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Here&apos;s what we&apos;ll do:</p>
              <ol className="space-y-3">
                <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span><strong className="text-gray-700 dark:text-gray-300">Take a deep breath</strong> — {petName} needs you focused right now.</span>
                </li>
                <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span><strong className="text-gray-700 dark:text-gray-300">Review {petName}&apos;s profile info</strong> — confirm or update their details so they&apos;re accurate.</span>
                </li>
                <li className="flex gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span><strong className="text-gray-700 dark:text-gray-300">Tell us where and when</strong> — provide the last known location and your contact details.</span>
                </li>
              </ol>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 text-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </Link>
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Let&apos;s Get Started
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Basic Profile Review ── */}
        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Missing Pet Report <span className="text-gray-400 font-normal text-xl">(Step 1 of 3)</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Review and update <strong>{petName}</strong>&apos;s basic information. Any changes will be saved to their profile and used in your missing pet report.
            </p>

            <div className="space-y-6">
              {/* Photo */}
              <div>
                <label className={labelClass}>Pet Photo</label>
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handlePhotoChange} className="hidden" />
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-5 text-center hover:border-gray-400 transition-colors">
                  {profile.photo ? (
                    <img src={URL.createObjectURL(profile.photo)} alt="Pet preview" className="w-28 h-28 object-cover rounded-lg mx-auto mb-3" />
                  ) : profile.photoUrl ? (
                    <img src={profile.photoUrl} alt={petName} className="w-28 h-28 object-cover rounded-lg mx-auto mb-3" />
                  ) : (
                    <Camera className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Use a clear, recent photo</p>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Upload className="w-4 h-4" />
                    {profile.photo || profile.photoUrl ? 'Change Photo' : 'Upload Photo'}
                  </button>
                </div>
              </div>

              {/* Name + Species */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Pet Name *</label>
                  <input type="text" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Species *</label>
                  <select value={profile.species} onChange={e => setProfile(p => ({ ...p, species: e.target.value }))} className={inputClass}>
                    <option value="">Select...</option>
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Bird</option>
                    <option>Rabbit</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Gender + Altered */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Gender</label>
                  <select value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))} className={inputClass}>
                    <option value="">Select...</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Unknown</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Spayed / Neutered?</label>
                  <div className="flex gap-2 mt-1">
                    {['Yes', 'No'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, altered: opt === 'Yes' }))}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          (opt === 'Yes' ? profile.altered : !profile.altered)
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Primary Breed + Breed Mix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Primary Breed</label>
                  <input type="text" value={profile.primaryBreed} onChange={e => setProfile(p => ({ ...p, primaryBreed: e.target.value }))} placeholder="e.g. Labrador Retriever" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Breed Mix</label>
                  <input type="text" value={profile.breedMix} onChange={e => setProfile(p => ({ ...p, breedMix: e.target.value }))} placeholder="e.g. Golden Retriever mix" className={inputClass} />
                </div>
              </div>

              {/* Weight */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Weight</label>
                  <input type="number" min="0" value={profile.weight} onChange={e => setProfile(p => ({ ...p, weight: e.target.value }))} placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Unit</label>
                  <div className="flex gap-2 mt-1">
                    {['lb', 'kg'].map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, weightUnit: u }))}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          profile.weightUnit === u
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Microchip + Rabies + License */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Microchip #</label>
                  <input type="text" value={profile.microchipId} onChange={e => setProfile(p => ({ ...p, microchipId: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Rabies Tag</label>
                  <input type="text" value={profile.rabiesTag} onChange={e => setProfile(p => ({ ...p, rabiesTag: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>License</label>
                  <input type="text" value={profile.license} onChange={e => setProfile(p => ({ ...p, license: e.target.value }))} className={inputClass} />
                </div>
              </div>

              {/* Birthday */}
              <div>
                <label className={labelClass}>Birthday</label>
                <input type="date" value={profile.birthday} onChange={e => setProfile(p => ({ ...p, birthday: e.target.value }))} className={inputClass} />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                Changes made here are saved directly to <strong>{petName}</strong>&apos;s profile.
              </p>
            </div>

            <div className="flex gap-3 mt-8">
              <Link href="/dashboard" className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm">
                Cancel
              </Link>
              <div className="flex-1" />
              <button
                onClick={() => setStep(2)}
                disabled={!profile.name || !profile.species}
                className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Description & Behavioral ── */}
        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Missing Pet Report <span className="text-gray-400 font-normal text-xl">(Step 2 of 3)</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              In <strong>{petName}</strong>&apos;s profile you can provide a physical description and behavioral notes. Please review and update so the information is accurate.
            </p>

            <div className="space-y-6">
              <div>
                <label className={labelClass}>Physical Description</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Distinctive markings, colorings, scars, or other identifying features</p>
                <textarea
                  value={profile.physicalDescription}
                  onChange={e => setProfile(p => ({ ...p, physicalDescription: e.target.value }))}
                  rows={4}
                  placeholder="e.g. Orange tabby with white paws, small scar above left eye"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Medical, Behavioral & Other Info</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Medications, behavioral quirks, favorite hangout spots, anything that helps identify or approach your pet safely</p>
                <textarea
                  value={profile.medicalBehavioral}
                  onChange={e => setProfile(p => ({ ...p, medicalBehavioral: e.target.value }))}
                  rows={4}
                  placeholder="e.g. Takes thyroid medication twice daily. Shy around strangers — try offering treats. Often found near the park on Oak Street."
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Link href="/dashboard" className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm">
                Cancel
              </Link>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                Go Back
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setStep(3)}
                className="bg-primary-600 hover:bg-primary-500 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Last Known Info & Submit ── */}
        {step === 3 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              Missing Pet Report <span className="text-gray-400 font-normal text-xl">(Step 3 of 3)</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Almost done! Tell us where and when <strong>{petName}</strong> was last seen, and how finders can reach you.
            </p>

            <div className="space-y-8">
              {/* Last Known Address */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Last Known Address</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Where was {petName} last seen? This helps us target where to share the alert.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Street *</label>
                    <input type="text" value={report.street} onChange={e => setReport(p => ({ ...p, street: e.target.value }))} placeholder="123 Main St" className={inputClass} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>City *</label>
                      <input type="text" value={report.city} onChange={e => setReport(p => ({ ...p, city: e.target.value }))} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>State *</label>
                      <input type="text" value={report.state} onChange={e => setReport(p => ({ ...p, state: e.target.value }))} className={inputClass} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Postal Code *</label>
                      <input type="text" value={report.postalCode} onChange={e => setReport(p => ({ ...p, postalCode: e.target.value }))} className={inputClass} required />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <input type="text" value={report.country} onChange={e => setReport(p => ({ ...p, country: e.target.value }))} className={inputClass} />
                    </div>
                  </div>
                </div>
              </div>

              {/* When */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-primary-600" />
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">When?</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  When was {petName} last seen? Keeping this up to date helps people know how urgently to look.
                </p>
                <div>
                  <label className={labelClass}>Date Last Seen *</label>
                  <input type="date" value={report.lastSeenDate} onChange={e => setReport(p => ({ ...p, lastSeenDate: e.target.value }))} className={inputClass} required />
                </div>
              </div>

              {/* Contact */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Phone className="w-4 h-4 text-primary-600" />
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Contact Information</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Include a phone number or email so finders can reach you directly. Make sure any contact you list knows they may be called.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Contact Info *</label>
                    <textarea
                      value={report.contactInfo}
                      onChange={e => setReport(p => ({ ...p, contactInfo: e.target.value }))}
                      rows={3}
                      placeholder="e.g. (555) 123-4567 or owner@email.com — call or text anytime"
                      className={inputClass}
                      required
                    />
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={report.rewardOffered}
                      onChange={e => setReport(p => ({ ...p, rewardOffered: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">A reward is being offered for a safe return</span>
                  </label>

                  <div>
                    <label className={labelClass}>Report Title</label>
                    <input
                      type="text"
                      value={report.reportTitle}
                      onChange={e => setReport(p => ({ ...p, reportTitle: e.target.value.slice(0, 20) }))}
                      placeholder={`Missing ${profile.species || 'Pet'}! Answers to '${petName}'`}
                      maxLength={20}
                      className={inputClass}
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{report.reportTitle.length}/20 characters</p>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 mt-8">
              <Link href="/dashboard" className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm">
                Cancel
              </Link>
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
              >
                Go Back
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSubmit}
                disabled={submitting || !report.street || !report.city || !report.state || !report.postalCode || !report.lastSeenDate || !report.contactInfo}
                className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Missing Pet Report'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Missing Pet Flyer ── */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Report Submitted!</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your missing pet report has been filed. Download and share the flyer below to help find {petName}.
              </p>
            </div>

            {/* Flyer Component */}
            <MissingPetFlyer
              petName={profile.name}
              species={profile.species}
              gender={profile.gender}
              breed={profile.primaryBreed}
              breedMix={profile.breedMix}
              weight={profile.weight}
              weightUnit={profile.weightUnit}
              photo={profile.photoUrl}
              lastSeenDate={report.lastSeenDate}
              lastSeenLocation={`${report.street}, ${report.city}, ${report.state} ${report.postalCode}`}
              physicalDescription={profile.physicalDescription}
              medicalBehavioral={profile.medicalBehavioral}
              ownerName={tagData?.pet?.ownerName}
              ownerPhone={tagData?.pet?.ownerPhone}
              vetName={tagData?.pet?.vetName}
              vetAddress={tagData?.pet?.vetAddress}
              contactInfo={report.contactInfo}
              rewardOffered={report.rewardOffered}
              tagCode={upperCode}
            />

            {/* Next Steps */}
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">Next steps:</p>
              <ul className="space-y-1.5 text-sm text-orange-700 dark:text-orange-300">
                <li>• Post on local Facebook groups and Nextdoor</li>
                <li>• Contact local animal shelters and vets</li>
                <li>• Put out clothing or bedding with your scent near home</li>
                <li>• Update this report if {petName} is found</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard" className="flex-1 text-center px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium">
                Back to Dashboard
              </Link>
              <Link href={`/pet/${upperCode}`} className="flex-1 text-center bg-primary-600 hover:bg-primary-500 text-white font-medium py-2.5 rounded-lg transition-colors">
                View Pet Profile
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
