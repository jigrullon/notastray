'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bell, Mail, MessageSquare, MapPin, Clock, Shield, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    smsEnabled: true,
    emailEnabled: true,
    instantNotifications: true,
    locationSharing: true,
    maxNotificationsPerHour: 3
  })

  const handleSave = async () => {
    // Save settings to backend
    console.log('Saving notification settings:', settings)
    // Show success message
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
            {/* Notification Methods */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-primary-600" />
                Notification Methods
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <MessageSquare className="w-5 h-5 text-blue-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">SMS Notifications</h3>
                      <p className="text-sm text-gray-600">Get instant text messages when your pet's tag is scanned</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.smsEnabled}
                      onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <h3 className="font-medium text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-600">Receive detailed email alerts with location and next steps</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.emailEnabled}
                      onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
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
              <button
                onClick={handleSave}
                className="btn-primary px-6 py-2"
              >
                Save Settings
              </button>
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
    </div>
  )
}