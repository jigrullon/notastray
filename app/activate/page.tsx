'use client'

import { useState } from 'react'
import { Camera, Upload, Check } from 'lucide-react'

export default function ActivatePage() {
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
    setPetData({...petData, phone: formatted})
  }

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tagCode.length >= 6) {
      setStep(2)
    }
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(3)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Step {step} of 3</span>
            <span className="text-sm font-medium text-gray-500">{Math.round((step / 3) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Activate Your Tag</h1>
            <p className="text-gray-600 mb-8">
              Enter the code found on your NotAStray tag to get started
            </p>

            <form onSubmit={handleCodeSubmit}>
              <div className="mb-6">
                <label htmlFor="tagCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Tag Code
                </label>
                <input
                  type="text"
                  id="tagCode"
                  value={tagCode}
                  onChange={(e) => setTagCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg font-mono"
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  This code is printed on your tag and looks like "ABC123"
                </p>
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
          <div className="bg-white rounded-lg shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Pet Profile</h1>
            <p className="text-gray-600 mb-8">
              Fill out your pet's information to help them get home safely
            </p>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Pet Photo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pet Photo
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">Upload a clear photo of your pet</p>
                  <button type="button" className="btn-outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Photo
                  </button>
                </div>
              </div>

              {/* Pet Name */}
              <div>
                <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-2">
                  Pet Name *
                </label>
                <input
                  type="text"
                  id="petName"
                  value={petData.name}
                  onChange={(e) => setPetData({...petData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              {/* Owner Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-2">
                    Owner's First Name *
                  </label>
                  <input
                    type="text"
                    id="ownerName"
                    value={petData.ownerName}
                    onChange={(e) => setPetData({...petData, ownerName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={petData.phone}
                    onChange={handlePhoneChange}
                    placeholder="123-456-7890"
                    maxLength={12}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  id="address"
                  value={petData.address}
                  onChange={(e) => setPetData({...petData, address: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Vet Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="vetName" className="block text-sm font-medium text-gray-700 mb-2">
                    Veterinarian Name
                  </label>
                  <input
                    type="text"
                    id="vetName"
                    value={petData.vetName}
                    onChange={(e) => setPetData({...petData, vetName: e.target.value})}
                    placeholder="Dr. Smith"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="vetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                    Vet Clinic Address
                  </label>
                  <input
                    type="text"
                    id="vetAddress"
                    value={petData.vetAddress}
                    onChange={(e) => setPetData({...petData, vetAddress: e.target.value})}
                    placeholder="123 Main St, City, State"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Medical Info */}
              <div>
                <label htmlFor="allergies" className="block text-sm font-medium text-gray-700 mb-2">
                  Allergies & Medical Information
                </label>
                <textarea
                  id="allergies"
                  value={petData.allergies}
                  onChange={(e) => setPetData({...petData, allergies: e.target.value})}
                  rows={3}
                  placeholder="List any allergies, medications, or medical conditions..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Temperament */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pet is good with:
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={petData.goodWithDogs}
                      onChange={(e) => setPetData({...petData, goodWithDogs: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700">Dogs</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={petData.goodWithCats}
                      onChange={(e) => setPetData({...petData, goodWithCats: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700">Cats</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={petData.goodWithChildren}
                      onChange={(e) => setPetData({...petData, goodWithChildren: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-gray-700">Children</span>
                  </label>
                </div>
              </div>

              <button type="submit" className="w-full btn-primary py-3 text-lg">
                Create Profile
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Created!</h1>
            <p className="text-gray-600 mb-8">
              Your pet's profile is now active. The QR code on tag {tagCode} will now 
              direct to their profile page.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-2">What's next?</h3>
              <ul className="text-left text-gray-600 space-y-2">
                <li>• Attach the tag to your pet's collar</li>
                <li>• Test the QR code by scanning it with your phone</li>
                <li>• Update the profile anytime from your account</li>
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
        )}
      </div>
    </div>
  )
}