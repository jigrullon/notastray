'use client'

import { useState, useEffect } from 'react'
import { Phone, MapPin, Heart, AlertTriangle, Users, Dog, Cat, Baby, Navigation, CheckCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

// This would normally come from a database
const mockPetData = {
  name: "Buddy",
  photo: "/api/placeholder/300/300",
  owner: "Sarah",
  address: "123 Oak Street, Portland, OR 97201",
  phone: "(555) 123-4567",
  vet: "Portland Pet Clinic - Dr. Smith",
  vetAddress: "456 Pine Ave, Portland, OR 97202",
  allergies: "Allergic to peanuts and shellfish. Takes daily heart medication (Enalapril 5mg).",
  goodWithDogs: true,
  goodWithCats: false,
  goodWithChildren: true,
  lastSeen: "2 hours ago"
}

export function generateStaticParams() {
  return [
    { code: 'example' },
    { code: 'ABC123' },
    { code: 'demo' }
  ]
}

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}

export default function PetProfilePage({ params }: { params: { code: string } }) {
  const pathname = usePathname()
  // Handle static export fallback: if served via rewrite, params.code might be fixed
  const code = (params.code === 'example' || params.code === 'demo') && pathname 
    ? pathname.split('/').pop() || params.code 
    : params.code

  const [notificationSent, setNotificationSent] = useState(false)
  const [location, setLocation] = useState<LocationData | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  // Send notification when page loads
  useEffect(() => {
    const sendNotification = async () => {
      try {
        // Get location if available
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const locationData: LocationData = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
              }
              
              // Try to get address from coordinates
              try {
                const response = await fetch(`/api/geocode?lat=${locationData.latitude}&lng=${locationData.longitude}`)
                if (response.ok) {
                  const data = await response.json()
                  locationData.address = data.address
                }
              } catch (error) {
                console.log('Geocoding failed, using coordinates only')
              }
              
              setLocation(locationData)
              await sendNotificationWithLocation(locationData)
            },
            async (error) => {
              setLocationError(error.message)
              // Send notification without precise location, use IP-based location
              await sendNotificationWithIPLocation()
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            }
          )
        } else {
          // Geolocation not supported, use IP-based location
          await sendNotificationWithIPLocation()
        }
      } catch (error) {
        console.error('Failed to send notification:', error)
      }
    }

    sendNotification()
  }, [code])

  const sendNotificationWithLocation = async (locationData: LocationData) => {
    try {
      const response = await fetch('/api/notify-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagCode: code,
          location: locationData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }),
      })

      if (response.ok) {
        setNotificationSent(true)
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }

  const sendNotificationWithIPLocation = async () => {
    try {
      // Get approximate location from IP
      const ipResponse = await fetch('/api/ip-location')
      let ipLocation = null
      
      if (ipResponse.ok) {
        ipLocation = await ipResponse.json()
      }

      const response = await fetch('/api/notify-owner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tagCode: code,
          location: ipLocation,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          locationMethod: 'ip'
        }),
      })

      if (response.ok) {
        setNotificationSent(true)
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Notification Status */}
        {notificationSent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-green-800 font-medium">Owner has been notified!</p>
                <p className="text-green-700 text-sm">
                  {location 
                    ? `Location shared: ${location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}`
                    : 'Approximate location shared'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            <p className="text-amber-800 font-medium">
              Found Pet Alert - Please help reunite this pet with their family
            </p>
          </div>
        </div>

        {/* Pet Profile Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Pet Photo and Basic Info */}
          <div className="p-6 text-center border-b border-gray-200">
            <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto mb-4 overflow-hidden">
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-4xl font-bold">B</span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{mockPetData.name}</h1>
            <p className="text-gray-600">Golden Retriever</p>
          </div>

          {/* Contact Information */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-primary-600" />
              Contact Owner
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">{mockPetData.owner}</span>
                <a 
                  href={`tel:${mockPetData.phone}`}
                  className="btn-primary"
                >
                  Call Now
                </a>
              </div>
              
              {mockPetData.address && (
                <div className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                  <span className="text-gray-700">{mockPetData.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Medical Information */}
          {mockPetData.allergies && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Heart className="w-5 h-5 mr-2 text-red-500" />
                Medical Information
              </h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{mockPetData.allergies}</p>
              </div>
            </div>
          )}

          {/* Veterinarian */}
          {mockPetData.vet && (
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Veterinarian</h2>
              <div className="space-y-2">
                <p className="text-gray-700 font-medium">{mockPetData.vet}</p>
                {mockPetData.vetAddress && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-gray-600 text-sm">{mockPetData.vetAddress}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Temperament */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-primary-600" />
              Temperament
            </h2>
            <div className="flex flex-wrap gap-2">
              {mockPetData.goodWithDogs && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  <Dog className="w-4 h-4 mr-1" />
                  Good with dogs
                </span>
              )}
              {mockPetData.goodWithCats && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  <Cat className="w-4 h-4 mr-1" />
                  Good with cats
                </span>
              )}
              {mockPetData.goodWithChildren && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  <Baby className="w-4 h-4 mr-1" />
                  Good with children
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <a 
                href={`tel:${mockPetData.phone}`}
                className="btn-primary flex-1 text-center py-3"
              >
                Call Owner Now
              </a>
              <button className="btn-outline flex-1 py-3">
                Report Found
              </button>
            </div>
            
            <p className="text-center text-sm text-gray-500 mt-4">
              Tag ID: {code} • Powered by NotAStray
            </p>
          </div>
        </div>

        {/* Safety Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Found a pet? Here's how to help:</h3>
          <ul className="text-blue-800 text-sm space-y-1">
            <li>• Keep the pet safe and secure</li>
            <li>• Call the owner using the number above</li>
            <li>• If no answer, try texting or calling again later</li>
            <li>• Consider taking the pet to the listed veterinarian</li>
          </ul>
        </div>
      </div>
    </div>
  )
}