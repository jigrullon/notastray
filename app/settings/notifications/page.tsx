'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Bell, Mail, MessageSquare, MapPin, Clock, Shield, ArrowLeft, User, Phone, Save, Loader2, Plus } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'

export default function NotificationSettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [testStatus, setTestStatus] = useState<{
    email: 'idle' | 'sending' | 'sent' | 'error';
    sms: 'idle' | 'sending' | 'sent' | 'error';
  }>({ email: 'idle', sms: 'idle' })

  const [contactInfo, setContactInfo] = useState({
    email: '',
    phone: '',
    // Optional second SMS recipient (e.g. a spouse) who gets the same scan alerts.
    phone2: ''
  })

  const [firstName, setFirstName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)

  const validateName = (name: string): string | null => {
    const trimmed = name.trim()
    if (!trimmed) return 'First name is required'
    if (trimmed.length > 100) return 'First name must be 100 characters or less'
    return null
  }

  const [settings, setSettings] = useState({
    smsEnabled: false,
    emailEnabled: true,
    instantNotifications: true,
    locationSharing: true,
    maxNotificationsPerHour: 3
  })

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

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
              phone: data.phone || '',
              phone2: data.phone2 || ''
            })
            setFirstName(data.displayName || user?.displayName || '')
            setOriginalPhone(data.phone || '')
            setOriginalPhone2(data.phone2 || '')
            // Each number's consent is tracked independently — a value here only
            // ever comes from that specific number's own consent confirmation.
            setPhoneConsentedAt(data.phoneConsentedAt || null)
            setPhone2ConsentedAt(data.phone2ConsentedAt || null)
            if (data.phone2) setPhone2Expanded(true)

            // Load preferences from Firestore
            if (data.preferences) {
              setSettings(prev => ({
                ...prev,
                smsEnabled: data.preferences.sms?.optIn ?? false,
                emailEnabled: data.preferences.email?.optIn ?? true,
                maxNotificationsPerHour: data.preferences.maxNotificationsPerHour ?? 3,
                locationSharing: data.preferences.locationSharing ?? true
              }))
            }
          } else {
            setContactInfo(prev => ({ ...prev, email: user.email || '' }))
            setFirstName(user?.displayName || '')
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
      fetchData()
    }
  }, [user])

  const [consentChecked, setConsentChecked] = useState(false)
  // Numbers still needing their own separate consent confirmation, front-to-back.
  // The modal is open whenever this is non-empty, showing whichever is at the front.
  const [consentQueue, setConsentQueue] = useState<Array<'phone' | 'phone2'>>([])
  const showSMSConsent = consentQueue.length > 0
  const consentTarget = consentQueue[0] ?? null
  const [originalPhone, setOriginalPhone] = useState('')
  const [originalPhone2, setOriginalPhone2] = useState('')
  // Independent per-number consent records — confirming one must never affect the other.
  const [phoneConsentedAt, setPhoneConsentedAt] = useState<string | null>(null)
  const [phone2ConsentedAt, setPhone2ConsentedAt] = useState<string | null>(null)
  const [phone2Expanded, setPhone2Expanded] = useState(false)
  const [pendingAction, setPendingAction] = useState<'save' | 'test' | null>(null)

  const phoneChanged = () => contactInfo.phone.trim() !== originalPhone.trim()
  const phone2Changed = () => contactInfo.phone2.trim() !== originalPhone2.trim()

  const handleTestNotification = async (type: 'email' | 'sms') => {
    if (!user) return

    // SMS Consent Check — the Test button only ever targets the primary number
    if (type === 'sms' && (!phoneConsentedAt || phoneChanged())) {
      setPendingAction('test')
      setConsentQueue(['phone'])
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
      const token = await user.getIdToken()
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

  // Persists all settings, optionally recording fresh consent for exactly one
  // number. Shared by the no-consent-needed save path and each step of the
  // consent queue below — the two numbers' consent records are never touched
  // in the same call, so confirming one can't invalidate the other.
  // `isFinal` skips the Firebase Auth reload for intermediate queue steps —
  // it only needs to happen once, after the last save in a sequence.
  const persistSettings = async (consentFor: 'phone' | 'phone2' | null, isFinal = true) => {
    if (!user) return false
    setSaving(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/user/consent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          smsOptIn: settings.smsEnabled,
          emailOptIn: settings.emailEnabled,
          phone: contactInfo.phone,
          phone2: contactInfo.phone2,
          consentFor,
          email: contactInfo.email,
          displayName: firstName.trim(),
          consentMethod: 'user_selection',
          maxNotificationsPerHour: settings.maxNotificationsPerHour,
          locationSharing: settings.locationSharing,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings')
      }

      if (isFinal && auth.currentUser) {
        await auth.currentUser.reload()
      }
      setFirstName(firstName.trim())
      setOriginalPhone(contactInfo.phone.trim())
      setOriginalPhone2(contactInfo.phone2.trim())
      const now = new Date().toISOString()
      if (consentFor === 'phone') setPhoneConsentedAt(now)
      if (consentFor === 'phone2') setPhone2ConsentedAt(now)

      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('An error occurred while saving.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleConsentConfirm = async () => {
    if (!consentTarget) return
    const isLastInQueue = consentQueue.length === 1

    const ok = await persistSettings(consentTarget, isLastInQueue)
    if (!ok) return

    setConsentChecked(false)
    setConsentQueue(q => q.slice(1))

    if (!isLastInQueue) return

    const action = pendingAction
    setPendingAction(null)

    if (action === 'save') {
      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    // 'test' — only ever queued for the primary number; send the test SMS now
    // that its consent is confirmed.
    const phone = contactInfo.phone.trim()
    if (!phone) {
      alert('Please enter a valid phone number first.')
      return
    }
    setTestStatus(prev => ({ ...prev, sms: 'sending' }))
    setSuccessMessage('')
    try {
      const token = await user?.getIdToken()
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: 'sms', to: phone }),
      })
      const data = await response.json()
      if (data.success) {
        setTestStatus(prev => ({ ...prev, sms: 'sent' }))
        setTimeout(() => setTestStatus(prev => ({ ...prev, sms: 'idle' })), 3000)
      } else {
        alert(`Failed to send test: ${data.error}`)
        setTestStatus(prev => ({ ...prev, sms: 'error' }))
        setTimeout(() => setTestStatus(prev => ({ ...prev, sms: 'idle' })), 3000)
      }
    } catch (error) {
      console.error('Test notification error:', error)
      alert('An error occurred while sending the test notification.')
      setTestStatus(prev => ({ ...prev, sms: 'error' }))
      setTimeout(() => setTestStatus(prev => ({ ...prev, sms: 'idle' })), 3000)
    }
  }

  const handleSave = async () => {
    if (!user) return

    // Validate name
    const error = validateName(firstName)
    if (error) {
      setNameError(error)
      return
    }

    // Each changed number needs its own separate consent step — queue them
    // rather than confirming both at once.
    const queue: Array<'phone' | 'phone2'> = []
    if (settings.smsEnabled && contactInfo.phone.trim() && phoneChanged()) queue.push('phone')
    if (settings.smsEnabled && contactInfo.phone2.trim() && phone2Changed()) queue.push('phone2')

    if (queue.length > 0) {
      setPendingAction('save')
      setConsentQueue(queue)
      return
    }

    await persistSettings(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href={user ? '/dashboard' : '/'}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notification Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure how you want to be notified when someone scans your pet&apos;s tag
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* User Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-primary-600" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="firstName"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value)
                        setNameError(null)
                      }}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="John"
                    />
                  </div>
                  {nameError && (
                    <p className="text-red-500 text-sm mt-1">{nameError}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Methods */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary-600" />
                Notification Methods
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts via email</p>
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
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">SMS Notifications</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts via text message</p>
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
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                {settings.smsEnabled && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {!phone2Expanded ? (
                      <button
                        type="button"
                        onClick={() => setPhone2Expanded(true)}
                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Add a phone number
                      </button>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="phone2" className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                            Second phone number
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setContactInfo(prev => ({ ...prev, phone2: '' }))
                              setPhone2Expanded(false)
                            }}
                            className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                          Gets the same scan alerts as your primary number, with its own separate consent —
                          great for a spouse or partner.
                        </p>
                        <div className="relative max-w-xs">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Phone className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            id="phone2"
                            value={contactInfo.phone2}
                            onChange={(e) => setContactInfo({ ...contactInfo, phone2: e.target.value })}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                            placeholder="(555) 987-6543"
                          />
                        </div>
                        {phone2ConsentedAt && !phone2Changed() && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Consent given {new Date(phone2ConsentedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Location Settings */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary-600" />
                Location Information
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex items-center">
                    <Shield className="w-5 h-5 text-purple-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100">Share Scanner Location</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Include the location where your pet&apos;s tag was scanned in notifications</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.locationSharing}
                      onChange={(e) => setSettings({ ...settings, locationSharing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">How location works:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                    <li>First, we try to get precise GPS location (requires permission)</li>
                    <li>If GPS isn&apos;t available, we use approximate location based on internet connection</li>
                    <li>Location accuracy is always indicated in notifications</li>
                    <li>No location data is stored permanently</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Rate Limiting */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary-600" />
                Notification Frequency
              </h2>

              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum notifications per hour
                </label>
                <select
                  value={settings.maxNotificationsPerHour}
                  onChange={(e) => setSettings({ ...settings, maxNotificationsPerHour: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value={1}>1 notification</option>
                  <option value={3}>3 notifications</option>
                  <option value={5}>5 notifications</option>
                  <option value={10}>10 notifications</option>
                  <option value={-1}>Unlimited</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Prevents spam if your pet&apos;s tag is scanned repeatedly by the same person
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
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

      </div>

      {/* SMS Consent Modal */}
      {showSMSConsent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                SMS Messaging Consent {consentTarget === 'phone2' ? '— Second Number' : ''}
              </h3>
              {consentQueue.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You&apos;ll be asked to confirm your other number separately right after this.
                </p>
              )}
            </div>

            <div className="p-6 overflow-y-auto">
              <p className="font-mono text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 mb-4 inline-block">
                {consentTarget === 'phone2' ? contactInfo.phone2 : contactInfo.phone}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                By providing this phone number and checking the box below, you consent to receive SMS text messages from NotAStray related to your pet&apos;s safety and identification services. Each phone number on your account is consented to separately.
              </p>

              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">What messages you&apos;ll receive:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Notifications when someone scans your pet&apos;s QR code tag</li>
                    <li>Important alerts about your lost pet</li>
                    <li>Service updates and account information</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Message frequency:</h4>
                  <p>Message frequency varies based on QR code scans and account activity. You may receive multiple messages if your pet&apos;s tag is scanned multiple times.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Standard rates:</h4>
                  <p>Message and data rates may apply. Check with your mobile carrier for details.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Opt-out:</h4>
                  <p>You can opt out at any time by replying STOP to any message. Reply HELP for assistance.</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Privacy:</h4>
                  <p>Your contact information will only be used for pet identification and safety purposes. We will not share your information with third parties for marketing purposes. View our <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>.</p>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  By clicking &quot;I Agree&quot; or checking this box, you confirm that you are authorized to provide this phone number and consent to receive SMS messages as described above.
                </p>
              </div>

              <div className="mt-6 flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="consent-checkbox"
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="consent-checkbox" className="font-medium text-gray-700 dark:text-gray-300">
                    I agree to receive SMS notifications at this phone number, and confirm I&apos;m authorized to provide it if it isn&apos;t my own
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => {
                  setConsentChecked(false)
                  setConsentQueue([])
                  setPendingAction(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConsentConfirm}
                disabled={!consentChecked}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
