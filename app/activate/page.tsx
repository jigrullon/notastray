'use client'

import { useState } from 'react'
import { Camera, Upload, Check, ArrowLeft, Shield, Star, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '../../lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'

export default function ActivatePage() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [tagCode, setTagCode] = useState('')
  const [petData, setPetData] = useState({
    name: '',
    photo: null as File | null,
    ownerName: '',
    address: '',
    phone: '',
    vetName: '',
    vetAddress: '',
    allergies: '',
    goodWithDogs: false,
    goodWithCats: false,
    goodWithChildren: false,
  })

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
      if (tagDoc.data().isActive) {
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
    if (!user) {
      setActivateError('You must be logged in to activate a tag.')
      return
    }
    setActivateLoading(true)
    setActivateError(null)

    try {
      const tagRef = doc(db, 'tags', tagCode)
      const userRef = doc(db, 'users', user.uid)

      // Write pet profile to tag document
      await updateDoc(tagRef, {
        isActive: true,
        userId: user.uid,
        pet: {
          name: petData.name,
          photo: '', // TODO: upload to Firebase Storage
          ownerName: petData.ownerName,
          ownerAddress: petData.address,
          ownerPhone: petData.phone,
          vetName: petData.vetName,
          vetAddress: petData.vetAddress,
          allergies: petData.allergies,
          goodWithDogs: petData.goodWithDogs,
          goodWithCats: petData.goodWithCats,
          goodWithChildren: petData.goodWithChildren,
        },
        activatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      // Add tag code to user's tagCodes array
      await updateDoc(userRef, {
        tagCodes: arrayUnion(tagCode),
        updatedAt: new Date().toISOString(),
      })

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
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                  <Camera className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Upload a clear photo of your pet</p>
                  <button type="button" className="btn-outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photo
                  </button>
                </div>
              </div>

              {/* Pet Name */}
              <div>
                <label htmlFor="petName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pet Name *
                </label>
                <input
                  type="text"
                  id="petName"
                  value={petData.name}
                  onChange={(e) => setPetData({ ...petData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                  required
                />
              </div>

              {/* Owner Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Owner's First Name *
                  </label>
                  <input
                    type="text"
                    id="ownerName"
                    value={petData.ownerName}
                    onChange={(e) => setPetData({ ...petData, ownerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={petData.phone}
                    onChange={handlePhoneChange}
                    placeholder="123-456-7890"
                    maxLength={12}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400"
                    required
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
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={petData.goodWithDogs}
                      onChange={(e) => setPetData({ ...petData, goodWithDogs: e.target.checked })}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Dogs</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={petData.goodWithCats}
                      onChange={(e) => setPetData({ ...petData, goodWithCats: e.target.checked })}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Cats</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={petData.goodWithChildren}
                      onChange={(e) => setPetData({ ...petData, goodWithChildren: e.target.checked })}
                      className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">Children</span>
                  </label>
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
                <button className="btn-primary flex-1">
                  View Profile
                </button>
                <button className="btn-outline flex-1">
                  Manage Account
                </button>
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
