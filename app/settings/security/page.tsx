'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowLeft, Lock, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useRouter } from 'next/navigation'

export default function SecuritySettingsPage() {
  const { user, loading, changePassword } = useAuth()
  const router = useRouter()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const hasPasswordProvider = user?.providerData.some((p) => p.providerId === 'password') ?? false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.')
      return
    }

    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      router.push('/dashboard?passwordChanged=1')
    } catch (err: any) {
      switch (err?.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Your current password is incorrect.')
          break
        case 'auth/weak-password':
          setError('New password is too weak. Please choose a stronger password.')
          break
        case 'auth/too-many-requests':
          setError('Too many attempts. Please wait a bit and try again.')
          break
        case 'auth/requires-recent-login':
          setError('For security, please log out and log back in before changing your password.')
          break
        default:
          setError('Something went wrong changing your password. Please try again.')
      }
    } finally {
      setSaving(false)
    }
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
              <Lock className="w-6 h-6 mr-2 text-primary-600" />
              Change Your Password
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Update your account password. You&apos;ll stay signed in on this device.
            </p>
          </div>

          <div className="p-6">
            {!hasPasswordProvider ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your account doesn&apos;t use a password sign-in method, so there&apos;s nothing to change here.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyRound className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      id="currentPassword"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      id="newPassword"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      id="confirmPassword"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="Re-enter new password"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPasswords((v) => !v)}
                  className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  {showPasswords ? (
                    <EyeOff className="w-4 h-4 mr-1" />
                  ) : (
                    <Eye className="w-4 h-4 mr-1" />
                  )}
                  {showPasswords ? 'Hide passwords' : 'Show passwords'}
                </button>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}

                <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary px-6 py-2 flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
