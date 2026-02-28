'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, MapPin, Clock, Shield, ArrowLeft, User, Phone, Save } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [testStatus, setTestStatus] = useState<{
    email: 'idle' | 'sending' | 'sent' | 'error';
    sms: 'idle' | 'sending' | 'sent' | 'error';
  }>({ email: 'idle', sms: 'idle' })

  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: ''
  })

  const [settings, setSettings] = useState({
    smsEnabled: true,
    emailEnabled: true,
    instantNotifications: true,
    locationSharing: true,
    maxNotificationsPerHour: 3
  })

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const docRef = doc(db, 'users', user.uid)
          const docSnap = await getDoc(docRef)

          if (docSnap.exists()) {
            const data = docSnap.data()
            setContactInfo({
              email: data.email || user.email || '',
              phone: data.phone || ''
            })

            // Check for existing consent
            if (data.consent?.smsOptIn) {
              setSmsConsentAccepted(true)
            }
          } else {
            setContactInfo(prev => ({ ...prev, email: user.email || '' }))
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
      fetchData()
    }
  }, [user])

  const [showSMSConsent, setShowSMSConsent] = useState(false)
  const [smsConsentAccepted, setSmsConsentAccepted] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)

  const handleTestNotification = async (type: 'email' | 'sms') => {
    if (!user) return

    // SMS Consent Check
    if (type === 'sms' && !smsConsentAccepted) {
      setShowSMSConsent(true)
      return
    }

    // Get the destination based on type
    const to = type === 'email' ? contactInfo.email : contactInfo.phone

    // Basic validation
    if (!to) {
      alert(`Please enter a valid ${type === 'email' ? 'email address' : 'phone number'} first.`)
      return
    }

    setTestStatus(prev => ({ ...prev, [type]: 'sending' }))
    setSuccessMessage('')

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          to,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setTestStatus(prev => ({ ...prev, [type]: 'sent' }))
        setTimeout(() => {
          setTestStatus(prev => ({ ...prev, [type]: 'idle' }))
        }, 3000)
      } else {
        alert(`Failed to send test: ${data.error}`)
        setTestStatus(prev => ({ ...prev, [type]: 'error' }))
        setTimeout(() => {
          setTestStatus(prev => ({ ...prev, [type]: 'idle' }))
        }, 3000)
      }
    } catch (error) {
      console.error('Test notification error:', error)
      alert('An error occurred while sending the test notification.')
      setTestStatus(prev => ({ ...prev, [type]: 'error' }))
      setTimeout(() => {
        setTestStatus(prev => ({ ...prev, [type]: 'idle' }))
      }, 3000)
    }
  }

  const handleConsentConfirm = async () => {
    // Save consent immediately when confirmed
    try {
      if (user) {
        const response = await fetch('/api/user/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            phone: contactInfo.phone,
            email: contactInfo.email,
            consentIp: 'client-ip'
          }),
        })

        const data = await response.json()
        if (data.success && data.data) {
          const docRef = doc(db, 'users', user.uid)
          await setDoc(docRef, {
            ...data.data,
            updatedAt: new Date().toISOString()
          }, { merge: true })
        }
      }
    } catch (err) {
      console.error("Failed to save consent record", err)
    }

    setSmsConsentAccepted(true)
    setShowSMSConsent(false)
    handleTestNotification('sms')
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setSuccessMessage('')

    try {
      // Use the secure API route to get encrypted data
      const response = await fetch('/api/user/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          phone: contactInfo.phone,
          email: contactInfo.email,
          consentIp: 'client-ip',
        }),
      })

      const data = await response.json()

      if (data.success && data.data) {
        // Save the Encrypted Data to Firestore using Client SDK
        // This works because the user is authenticated and rules allow write to own doc
        const docRef = doc(db, 'users', user.uid)
        await setDoc(docRef, {
          ...data.data,
          updatedAt: new Date().toISOString()
        }, { merge: true })

        setSuccessMessage('Settings saved successfully!')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        throw new Error(data.error || 'Failed to encrypt data')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={user ? '/dashboard' : '/'}
            className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure how you want to be notified when someone scans your pet's tag
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* User Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary-600" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Methods */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary-600" />
                Notification Methods
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-500">Receive alerts via email</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleTestNotification('email')}
                      disabled={!contactInfo.email || testStatus.email === 'sending'}
                      className={`text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${testStatus.email === 'sent' ? 'text-green-600' :
                        testStatus.email === 'error' ? 'text-red-600' :
                          'text-primary-600 hover:text-primary-700'
                        }`}
                    >
                      {testStatus.email === 'idle' && 'Test'}
                      {testStatus.email === 'sending' && 'Sending...'}
                      {testStatus.email === 'sent' && 'Sent!'}
                      {testStatus.email === 'error' && 'Failed'}
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.emailEnabled}
                        onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">SMS Notifications</h3>
                      <p className="text-sm text-gray-500">Receive alerts via text message</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleTestNotification('sms')}
                      disabled={!contactInfo.phone || testStatus.sms === 'sending'}
                      className={`text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${testStatus.sms === 'sent' ? 'text-green-600' :
                        testStatus.sms === 'error' ? 'text-red-600' :
                          'text-primary-600 hover:text-primary-700'
                        }`}
                    >
                      {testStatus.sms === 'idle' && 'Test'}
                      {testStatus.sms === 'sending' && 'Sending...'}
                      {testStatus.sms === 'sent' && 'Sent!'}
                      {testStatus.sms === 'error' && 'Failed'}
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={settings.smsEnabled}
                        onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Location Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                Location Information
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-purple-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Share Scanner Location</h3>
                      <p className="text-sm text-gray-600">Include the location where your pet's tag was scanned in notifications</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.locationSharing}
                      onChange={(e) => setSettings({ ...settings, locationSharing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How location works:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• First, we try to get precise GPS location (requires permission)</li>
                    <li>• If GPS isn't available, we use approximate location based on internet connection</li>
                    <li>• Location accuracy is always indicated in notifications</li>
                    <li>• No location data is stored permanently</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Rate Limiting */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary-600" />
                Rate Limiting
              </h2>

              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum notifications per hour
                </label>
                <select
                  value={settings.maxNotificationsPerHour}
                  onChange={(e) => setSettings({ ...settings, maxNotificationsPerHour: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={1}>1 notification</option>
                  <option value={3}>3 notifications</option>
                  <option value={5}>5 notifications</option>
                  <option value={10}>10 notifications</option>
                  <option value={-1}>Unlimited</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Prevents spam if your pet's tag is scanned repeatedly by the same person
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <div className="flex items-center">
                {successMessage && (
                  <span className="text-green-600 text-sm mr-4 font-medium animate-fade-in">
                    {successMessage}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary px-6 py-2 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Test Notification */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Your Notifications</h2>
          <p className="text-gray-600 mb-4">
            Send yourself a test notification to make sure everything is working correctly.
          </p>
          <button className="btn-outline">
            Send Test Notification
          </button>
        </div>
      </div>

      {/* SMS Consent Modal */}
      {showSMSConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">SMS Messaging Consent</h3>
            </div>

            <div className="p-6 overflow-y-auto">
              <p className="text-sm text-gray-600 mb-4">
                By providing your mobile phone number and checking this box, you consent to receive SMS text messages from NotAStray related to your pet's safety and identification services.
              </p>

              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">What messages you'll receive:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Notifications when someone scans your pet's QR code tag</li>
                    <li>Important alerts about your lost pet</li>
                    <li>Service updates and account information</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Message frequency:</h4>
                  <p>Message frequency varies based on QR code scans and account activity. You may receive multiple messages if your pet's tag is scanned multiple times.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Standard rates:</h4>
                  <p>Message and data rates may apply. Check with your mobile carrier for details.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Opt-out:</h4>
                  <p>You can opt out at any time by replying STOP to any message. Reply HELP for assistance.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Privacy:</h4>
                  <p>Your contact information will only be used for pet identification and safety purposes. We will not share your information with third parties for marketing purposes. View our <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.</p>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  By clicking "I Agree" or checking this box, you confirm that you are authorized to provide this phone number and consent to receive SMS messages as described above.
                </p>
              </div>

              <div className="mt-6 flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="consent-checkbox"
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="consent-checkbox" className="font-medium text-gray-700">
                    I agree to receive SMS notifications at the phone number provided
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => setShowSMSConsent(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConsentConfirm}
                disabled={!consentChecked}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}