'use client'

import { Suspense, useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera, Upload, Check, ArrowLeft, Shield, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/AuthContext'
import { db, storage } from '@/lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { getSpecies, getBreeds } from '@/lib/breedUtils'

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-cream dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    }>
      <ActivateContent />
    </Suspense>
  )
}

function ActivateContent() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [tagCode, setTagCode] = useState('')
  // URL from Firestore pet.photo — preserved in draft auto-saves; used as photoUrl fallback on submit
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  // Set when the submitted code belongs to the current user's already-activated tag
  const [ownActivatedTagCode, setOwnActivatedTagCode] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [petData, setPetData] = useState({
    name: '',
    photo: null as File | null,
    species: '',
    breed: '',
    birthday: '',
    address: '',
    vetName: '',
    vetAddress: '',
    allergies: '',
    behavioralNotes: '',
    goodWithDogs: '' as '' | 'yes' | 'no' | 'unsure',
    goodWithCats: '' as '' | 'yes' | 'no' | 'unsure',
    goodWithChildren: '' as '' | 'yes' | 'no' | 'unsure',
  })

  const [activateError, setActivateError] = useState<string | null>(null)
  const [activateLoading, setActivateLoading] = useState(false)
  const [subscribeLoading, setSubscribeLoading] = useState(false)

  // Owner contact info comes from the account, not the form: the activating
  // user IS the owner. First name from the auth display name; phone from the
  // users doc (collected at signup).
  const ownerFirstName = user?.displayName?.trim().split(/\s+/)[0] || ''
  const [accountPhone, setAccountPhone] = useState('')

  useEffect(() => {
    if (!user) return
    getDoc(doc(db, 'users', user.uid))
      .then((snap) => setAccountPhone((snap.data()?.phone as string) || ''))
      .catch((err) => console.error('Failed to load account phone:', err))
  }, [user])

  // Scroll back to the top when moving between steps so a short step after a
  // long one doesn't leave the view stuck at the bottom of the previous step.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [step])

  // Handle ?code= URL param.
  // - Not logged in: just prefill the step-1 code input; let the normal step-1 flow
  //   route the user to /signup or prompt them to sign in.
  // - Logged in: validate the tag, claim it (if unclaimed), prefill any saved draft,
  //   and advance directly to step 2.
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code || step !== 1) return

    const upperCode = code.toUpperCase()
    setTagCode(upperCode)

    if (!user) return // Not logged in — just prefill the step-1 input

    ;(async () => {
      try {
        const tagDoc = await getDoc(doc(db, 'tags', upperCode))
        if (!tagDoc.exists()) {
          setActivateError('Tag code not found. Please check and try again.')
          return
        }
        const data = tagDoc.data()!

        if (data.isActive && !data.isTestTag) {
          if (data.userId === user.uid) {
            setOwnActivatedTagCode(upperCode)
          } else {
            setActivateError('This tag has already been activated.')
          }
          return
        }

        if (data.userId && data.userId !== user.uid && !data.isTestTag) {
          setActivateError('This tag is already linked to another account.')
          return
        }

        // Claim if unclaimed
        if (!data.userId) {
          await updateDoc(doc(db, 'tags', upperCode), {
            userId: user.uid,
            claimedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })
        }

        // Prefill from Firestore draft if present
        if (data.pet) {
          const pet = data.pet
          setExistingPhotoUrl(pet.photo || null)
          setPetData({
            name: pet.name || '',
            photo: null,
            species: pet.species || '',
            breed: pet.breed || '',
            birthday: pet.birthday || '',
            address: pet.ownerAddress || '',
            vetName: pet.vetName || '',
            vetAddress: pet.vetAddress || '',
            allergies: pet.allergies || '',
            behavioralNotes: pet.behavioralNotes || '',
            goodWithDogs: (pet.goodWithDogs || '') as '' | 'yes' | 'no' | 'unsure',
            goodWithCats: (pet.goodWithCats || '') as '' | 'yes' | 'no' | 'unsure',
            goodWithChildren: (pet.goodWithChildren || '') as '' | 'yes' | 'no' | 'unsure',
          })
        }

        setStep(2)
      } catch (err) {
        console.error('Error handling ?code= param:', err)
        setActivateError('Unable to verify tag. Please try again.')
      }
    })()
  }, [searchParams, user, step])

  // Debounced auto-save: while editing the profile (step 2), persist the draft to
  // Firestore ~2.5 s after the last change. Does not upload the local photo file —
  // preserves the existing pet.photo URL from Firestore instead.
  useEffect(() => {
    if (step !== 2 || !user || !tagCode) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'tags', tagCode), {
          pet: {
            name: petData.name,
            species: petData.species,
            breed: petData.breed,
            birthday: petData.birthday,
            ownerName: ownerFirstName,
            ownerPhone: accountPhone,
            ownerAddress: petData.address,
            vetName: petData.vetName,
            vetAddress: petData.vetAddress,
            allergies: petData.allergies,
            behavioralNotes: petData.behavioralNotes,
            goodWithDogs: petData.goodWithDogs,
            goodWithCats: petData.goodWithCats,
            goodWithChildren: petData.goodWithChildren,
            photo: existingPhotoUrl || '',
          },
          updatedAt: new Date().toISOString(),
        })
        setDraftSaved(true)
        setTimeout(() => setDraftSaved(false), 3000)
      } catch (err) {
        console.error('Auto-save failed:', err)
      }
    }, 2500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [petData, step, user, tagCode, existingPhotoUrl, ownerFirstName, accountPhone])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPetData({ ...petData, photo: file })
  }


  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActivateError(null)
    setOwnActivatedTagCode(null)
    if (tagCode.length < 6) return

    try {
      const upperCode = tagCode.toUpperCase()
      const tagDoc = await getDoc(doc(db, 'tags', upperCode))
      if (!tagDoc.exists()) {
        setActivateError('Tag code not found. Please check and try again.')
        return
      }

      const data = tagDoc.data()!

      if (data.isActive && !data.isTestTag) {
        if (data.userId === user?.uid) {
          setOwnActivatedTagCode(upperCode)
        } else {
          setActivateError('This tag has already been activated.')
        }
        return
      }

      setTagCode(upperCode)

      if (!user) {
        // Account-first: route to signup carrying only the code. Profile data is not
        // passed in the URL — it will be persisted to Firestore after account creation.
        window.location.href = `/signup?from=activate&code=${upperCode}`
        return
      }

      // Logged in — claim if unclaimed, error if claimed by someone else
      if (data.userId && data.userId !== user.uid && !data.isTestTag) {
        setActivateError('This tag is already linked to another account.')
        return
      }
      if (!data.userId) {
        await updateDoc(doc(db, 'tags', upperCode), {
          userId: user.uid,
          claimedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      // Prefill from Firestore draft if present
      if (data.pet) {
        const pet = data.pet
        setExistingPhotoUrl(pet.photo || null)
        setPetData({
          name: pet.name || '',
          photo: null,
          species: pet.species || '',
          breed: pet.breed || '',
          birthday: pet.birthday || '',
          address: pet.ownerAddress || '',
          vetName: pet.vetName || '',
          vetAddress: pet.vetAddress || '',
          allergies: pet.allergies || '',
          behavioralNotes: pet.behavioralNotes || '',
          goodWithDogs: (pet.goodWithDogs || '') as '' | 'yes' | 'no' | 'unsure',
          goodWithCats: (pet.goodWithCats || '') as '' | 'yes' | 'no' | 'unsure',
          goodWithChildren: (pet.goodWithChildren || '') as '' | 'yes' | 'no' | 'unsure',
        })
      }

      setStep(2)
    } catch (err) {
      console.error('Error validating tag:', err)
      setActivateError('Unable to verify tag. Please try again.')
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return // user is always authenticated at step 2; guard only

    // Flush any pending auto-save before the final write
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    setActivateLoading(true)
    setActivateError(null)

    try {
      const tagRef = doc(db, 'tags', tagCode)
      const userRef = doc(db, 'users', user.uid)

      // Use the existing Firestore photo URL as fallback; upload if a new file was chosen
      let photoUrl = existingPhotoUrl || ''
      if (petData.photo) {
        const storageRef = ref(storage, `pet-photos/${tagCode}/${Date.now()}-${petData.photo.name}`)
        await uploadBytes(storageRef, petData.photo)
        photoUrl = await getDownloadURL(storageRef)
      }

      await updateDoc(tagRef, {
        isActive: true,
        userId: user.uid,
        pet: {
          name: petData.name,
          photo: photoUrl,
          species: petData.species,
          breed: petData.breed,
          birthday: petData.birthday,
          ownerName: ownerFirstName,
          ownerPhone: accountPhone,
          ownerAddress: petData.address,
          vetName: petData.vetName,
          vetAddress: petData.vetAddress,
          allergies: petData.allergies,
          behavioralNotes: petData.behavioralNotes,
          goodWithDogs: petData.goodWithDogs,
          goodWithCats: petData.goodWithCats,
          goodWithChildren: petData.goodWithChildren,
        },
        isLost: false,
        foundReports: [],
        activatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await updateDoc(userRef, {
        tagCodes: arrayUnion(tagCode),
        updatedAt: new Date().toISOString(),
      })

      // Fire-and-forget: never block the activation success screen on email delivery
      user.getIdToken()
        .then((idToken) =>
          fetch('/api/activate/confirmation-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ tagCode }),
          })
        )
        .catch((err) => console.error('Failed to send activation confirmation email:', err))

      setStep(3)
    } catch (err) {
      console.error('Error activating tag:', err)
      setActivateError('Failed to activate tag. Please try again.')
    } finally {
      setActivateLoading(false)
    }
  }

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setSubscribeLoading(true)
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userEmail: user?.email || undefined,
          userId: user?.uid || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        alert(data.error || 'You already have an active subscription.')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Subscribe error:', err)
    } finally {
      setSubscribeLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={user ? '/dashboard' : '/'}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </div>
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Step {step} of 3</span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Activate Your Tag</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Enter the code found on your NotAStray tag to get started
            </p>

            <form onSubmit={handleCodeSubmit}>
              <div className="mb-6">
                <label htmlFor="tagCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tag Code
                </label>
                <input
                  type="text"
                  id="tagCode"
                  value={tagCode}
                  onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-mono dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  required
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  This code is printed on your tag and looks like &quot;ABC123&quot;
                </p>
                {activateError && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {activateError}
                  </div>
                )}
                {ownActivatedTagCode && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      This tag is already activated.{' '}
                      <Link
                        href={`/pet/${ownActivatedTagCode}`}
                        className="underline font-medium"
                      >
                        View pet profile
                      </Link>
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full btn-primary py-3 text-lg"
                disabled={tagCode.length < 6}
              >
                Continue
              </button>

              {!user && (
                <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <Link
                    href={tagCode.length >= 6 ? `/login?from=activate&code=${tagCode}` : '/login'}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              )}
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Pet Profile</h1>
              <span className="shrink-0 px-2.5 py-1 rounded-md bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-mono text-sm font-semibold">
                Tag {tagCode}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Fill out your pet&apos;s information to help them get home safely
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Pet Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pet Photo
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  {petData.photo ? (
                    <img
                      src={URL.createObjectURL(petData.photo)}
                      alt="Pet preview"
                      className="w-32 h-32 object-cover rounded-lg mx-auto mb-4"
                    />
                  ) : existingPhotoUrl ? (
                    <img
                      src={existingPhotoUrl}
                      alt="Pet preview"
                      className="w-32 h-32 object-cover rounded-lg mx-auto mb-4"
                    />
                  ) : (
                    <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  )}
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Upload a clear photo of your pet</p>
                  <button type="button" className="btn-outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photo
                  </button>
                </div>
              </div>

              {/* Species & Breed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="species" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type of Animal
                  </label>
                  <select
                    id="species"
                    value={petData.species}
                    onChange={(e) => {
                      setPetData({ ...petData, species: e.target.value, breed: '' })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  >
                    <option value="">Select...</option>
                    {getSpecies().map((species) => (
                      <option key={species} value={species}>
                        {species}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="breed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Breed
                  </label>
                  {petData.species === 'Other' ? (
                    <input
                      type="text"
                      id="breed"
                      value={petData.breed}
                      onChange={(e) => setPetData({ ...petData, breed: e.target.value })}
                      placeholder="e.g., Ferret, Hamster"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    />
                  ) : petData.species && ['Dog', 'Cat'].includes(petData.species) ? (
                    <select
                      id="breed"
                      value={petData.breed}
                      onChange={(e) => setPetData({ ...petData, breed: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    >
                      <option value="">Select Breed...</option>
                      {getBreeds(petData.species).map((breed) => (
                        <option key={breed} value={breed}>
                          {breed}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      id="breed"
                      value={petData.breed}
                      onChange={(e) => setPetData({ ...petData, breed: e.target.value })}
                      placeholder="Select a species first"
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    />
                  )}
                </div>
              </div>

              {/* Pet Name & Birthday */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="petName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pet Name
                  </label>
                  <input
                    type="text"
                    id="petName"
                    value={petData.name}
                    onChange={(e) => setPetData({ ...petData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Birthday
                  </label>
                  <input
                    type="date"
                    id="birthday"
                    value={petData.birthday}
                    onChange={(e) => setPetData({ ...petData, birthday: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Owner name & phone come from the account — the activating user
                  is the owner. Editable later from the pet profile if needed. */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  value={petData.address}
                  onChange={(e) => setPetData({ ...petData, address: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>

              {/* Vet Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Veterinarian Clinic
                  </label>
                  <input
                    type="text"
                    id="vetName"
                    value={petData.vetName}
                    onChange={(e) => setPetData({ ...petData, vetName: e.target.value })}
                    placeholder="e.g. Springfield Animal Hospital"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="vetAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vet Clinic Address
                  </label>
                  <input
                    type="text"
                    id="vetAddress"
                    value={petData.vetAddress}
                    onChange={(e) => setPetData({ ...petData, vetAddress: e.target.value })}
                    placeholder="123 Main St, City, State"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Medical Info */}
              <div>
                <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Allergies &amp; Medical Information
                </label>
                <textarea
                  id="allergies"
                  value={petData.allergies}
                  onChange={(e) => setPetData({ ...petData, allergies: e.target.value })}
                  rows={3}
                  placeholder="List any allergies, medications, or medical conditions..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>

              {/* Behavioral Notes */}
              <div>
                <label htmlFor="behavioralNotes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Behavioral Notes
                </label>
                <textarea
                  id="behavioralNotes"
                  value={petData.behavioralNotes}
                  onChange={(e) => setPetData({ ...petData, behavioralNotes: e.target.value })}
                  rows={3}
                  placeholder={'e.g. "Scared of thunder," "Doesn\'t like men or people with hats," "Shy around strangers"...'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Anything a finder should know about your pet&apos;s temperament — not medical.
                </p>
              </div>

              {/* Temperament */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Pet is good with:
                </label>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Dogs</p>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithDogs"
                          value="yes"
                          checked={petData.goodWithDogs === 'yes'}
                          onChange={() => setPetData({ ...petData, goodWithDogs: 'yes' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithDogs"
                          value="no"
                          checked={petData.goodWithDogs === 'no'}
                          onChange={() => setPetData({ ...petData, goodWithDogs: 'no' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">No</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithDogs"
                          value="unsure"
                          checked={petData.goodWithDogs === 'unsure'}
                          onChange={() => setPetData({ ...petData, goodWithDogs: 'unsure' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Unsure</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Cats</p>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithCats"
                          value="yes"
                          checked={petData.goodWithCats === 'yes'}
                          onChange={() => setPetData({ ...petData, goodWithCats: 'yes' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithCats"
                          value="no"
                          checked={petData.goodWithCats === 'no'}
                          onChange={() => setPetData({ ...petData, goodWithCats: 'no' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">No</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithCats"
                          value="unsure"
                          checked={petData.goodWithCats === 'unsure'}
                          onChange={() => setPetData({ ...petData, goodWithCats: 'unsure' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Unsure</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Children</p>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithChildren"
                          value="yes"
                          checked={petData.goodWithChildren === 'yes'}
                          onChange={() => setPetData({ ...petData, goodWithChildren: 'yes' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Yes</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithChildren"
                          value="no"
                          checked={petData.goodWithChildren === 'no'}
                          onChange={() => setPetData({ ...petData, goodWithChildren: 'no' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">No</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="goodWithChildren"
                          value="unsure"
                          checked={petData.goodWithChildren === 'unsure'}
                          onChange={() => setPetData({ ...petData, goodWithChildren: 'unsure' })}
                          className="rounded-full border-gray-300 dark:border-gray-600 text-primary-600"
                        />
                        <span className="ml-2 text-gray-700 dark:text-gray-300">Unsure</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {activateError && (
                <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {activateError}
                </div>
              )}

              {draftSaved && (
                <p className="text-sm text-center text-green-600 dark:text-green-400">Draft saved</p>
              )}

              <button type="submit" className="w-full btn-primary py-3 text-lg flex items-center justify-center" disabled={activateLoading}>
                {activateLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Activating...
                  </>
                ) : 'Create Profile'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Profile Created!</h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your pet&apos;s profile is now active. The QR code on tag {tagCode} will now
                direct to their profile page.
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 mb-8">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">What&apos;s next?</h3>
                <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2">
                  <li>- Attach the tag to your pet&apos;s collar</li>
                  <li>- Test the QR code by scanning it with your phone</li>
                  <li>- Update the profile anytime from your account</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href={`/pet/${tagCode}`} className="btn-primary flex-1 text-center">
                  View Profile
                </Link>
                <Link href="/dashboard" className="btn-outline flex-1 text-center">
                  Manage Account
                </Link>
              </div>
            </div>

            {/* PROTECT Plan Upsell */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 border-2 border-primary-200 dark:border-primary-800">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add the PROTECT Plan</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get the most out of your tag</p>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Get instant SMS and email alerts when your tag is scanned, advanced location tracking, and a detailed medical profile for your pet.
              </p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                  <Check className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                  Instant SMS &amp; Email scan alerts
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                  <Check className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                  Advanced location tracking
                </li>
                <li className="flex items-center text-gray-700 dark:text-gray-300 text-sm">
                  <Check className="w-4 h-4 text-green-500 mr-2 shrink-0" />
                  Detailed medical profile
                </li>
              </ul>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => handleSubscribe('monthly')}
                  disabled={subscribeLoading}
                  className="w-full bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
                >
                  {subscribeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '$3/month'}
                </button>
                <button
                  onClick={() => handleSubscribe('yearly')}
                  disabled={subscribeLoading}
                  className="w-full bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
                >
                  {subscribeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <span>$30/year <span className="text-primary-200 text-xs ml-1">Save $6</span></span>
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link href="/protect" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                  Learn more about the PROTECT plan &rarr;
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
