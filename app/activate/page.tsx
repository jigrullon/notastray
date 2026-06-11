'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Camera, Upload, Check, ArrowLeft, Shield, Star, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/AuthContext'
import { db, storage } from '@/lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export default function ActivatePage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [autoSubmitReady, setAutoSubmitReady] = useState(false)
  const [tagCode, setTagCode] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [petData, setPetData] = useState({
    name: '',
    photo: null as File | null,
    species: '',
    breed: '',
    ownerName: '',
    address: '',
    phone: '',
    vetName: '',
    vetAddress: '',
    allergies: '',
    goodWithDogs: '' as '' | 'yes' | 'no' | 'unsure',
    goodWithCats: '' as '' | 'yes' | 'no' | 'unsure',
    goodWithChildren: '' as '' | 'yes' | 'no' | 'unsure',
  })

  useEffect(() => {
    const code = searchParams.get('code')
    if (code && user && !autoSubmitReady) {
      const savedData = sessionStorage.getItem('activationData')
      if (savedData) {
        try {
          const { tagCode: savedTagCode, petData: savedPetData } = JSON.parse(savedData)
          if (savedTagCode === code) {
            setTagCode(code)
            setPetData(savedPetData)
            setStep(2)
            setAutoSubmitReady(true)
          }
        } catch (err) {
          console.error('Failed to load activation data:', err)
        }
      }
    }
  }, [searchParams, user, autoSubmitReady])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setPetData({ ...petData, photo: file })
  }

  // Phone number formatting function
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const phoneNumber = value.replace(/\D/g, '')

    // Format as XXX-XXX-XXXX
    if (phoneNumber.length >= 6) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`
    } else if (phoneNumber.length >= 3) {
      return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3)}`
    }
    return phoneNumber
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPetData({ ...petData, phone: formatted })
  }

  const [activateError, setActivateError] = useState<string | null>(null)
  const [activateLoading, setActivateLoading] = useState(false)

  const submitActivation = async (code: string, data: typeof petData) => {
    try {
      if (!user) {
        sessionStorage.setItem('activationData', JSON.stringify({ tagCode: code, petData: data }))
        window.location.href = `/signup?from=activate&code=${code}`
        return
      }

      setActivateLoading(true)
      setActivateError(null)

      const tagRef = doc(db, 'tags', code)
      const userRef = doc(db, 'users', user.uid)

      let photoUrl = ''
      if (data.photo) {
        const storageRef = ref(storage, `pet-photos/${code}/${Date.now()}-${data.photo.name}`)
        await uploadBytes(storageRef, data.photo)
        photoUrl = await getDownloadURL(storageRef)
      }

      await updateDoc(tagRef, {
        isActive: true,
        userId: user.uid,
        pet: {
          name: data.name,
          photo: photoUrl,
          species: data.species,
          breed: data.breed,
          ownerName: data.ownerName,
          ownerAddress: data.address,
          ownerPhone: data.phone,
          vetName: data.vetName,
          vetAddress: data.vetAddress,
          allergies: data.allergies,
          goodWithDogs: data.goodWithDogs,
          goodWithCats: data.goodWithCats,
          goodWithChildren: data.goodWithChildren,
        },
        isLost: false,
        foundReports: [],
        activatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      await updateDoc(userRef, {
        tagCodes: arrayUnion(code),
        updatedAt: new Date().toISOString(),
      })

      setStep(3)
      sessionStorage.removeItem('activationData')
    } catch (err) {
      console.error('Error activating tag:', err)
      setActivateError('Failed to activate tag. Please try again.')
    } finally {
      setActivateLoading(false)
    }
  }

  useEffect(() => {
    if (autoSubmitReady && user && step === 2 && tagCode) {
      submitActivation(tagCode, petData)
      setAutoSubmitReady(false)
    }
  }, [autoSubmitReady, user, step, tagCode, petData])

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setActivateError(null)
    if (tagCode.length < 6) return

    // Validate tag exists in Firestore and is not already active
    try {
      const tagDoc = await getDoc(doc(db, 'tags', tagCode.toUpperCase()))
      if (!tagDoc.exists()) {
        setActivateError('Tag code not found. Please check and try again.')
        return
      }
      if (tagDoc.data().isActive && !tagDoc.data().isTestTag) {
        setActivateError('This tag has already been activated.')
        return
      }
      setTagCode(tagCode.toUpperCase())
      setStep(2)
    } catch (err) {
      console.error('Error validating tag:', err)
      setActivateError('Unable to verify tag. Please try again.')
    }
  }

  const [subscribeLoading, setSubscribeLoading] = useState(false)

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitActivation(tagCode, petData)
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
                  This code is printed on your tag and looks like "ABC123"
                </p>
                {activateError && (
                  <div className="mt-3 flex items-start gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {activateError}
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
            </form>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create Pet Profile</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Fill out your pet's information to help them get home safely
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
                    onChange={(e) => setPetData({ ...petData, species: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  >
                    <option value="">Select...</option>
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Bird">Bird</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="breed" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Breed
                  </label>
                  <input
                    type="text"
                    id="breed"
                    value={petData.breed}
                    onChange={(e) => setPetData({ ...petData, breed: e.target.value })}
                    placeholder="e.g., Golden Retriever, Tabby, Cockatiel"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Pet Name */}
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

              {/* Owner Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Owner's First Name
                  </label>
                  <input
                    type="text"
                    id="ownerName"
                    value={petData.ownerName}
                    onChange={(e) => setPetData({ ...petData, ownerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={petData.phone}
                    onChange={handlePhoneChange}
                    placeholder="123-456-7890"
                    maxLength={12}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  />
                </div>
              </div>

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
                    Veterinarian Name
                  </label>
                  <input
                    type="text"
                    id="vetName"
                    value={petData.vetName}
                    onChange={(e) => setPetData({ ...petData, vetName: e.target.value })}
                    placeholder="Dr. Smith"
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
                  Allergies & Medical Information
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
                          onChange={(e) => setPetData({ ...petData, goodWithDogs: 'yes' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithDogs: 'no' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithDogs: 'unsure' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithCats: 'yes' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithCats: 'no' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithCats: 'unsure' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithChildren: 'yes' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithChildren: 'no' })}
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
                          onChange={(e) => setPetData({ ...petData, goodWithChildren: 'unsure' })}
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
                Your pet's profile is now active. The QR code on tag {tagCode} will now
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
