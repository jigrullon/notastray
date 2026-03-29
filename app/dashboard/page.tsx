'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { Loader2, Package, Settings, Heart, Shield, Check, Star } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, logOut } = useAuth()
  const [subscribeLoading, setSubscribeLoading] = useState(false)

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
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Subscribe error:', err)
    } finally {
      setSubscribeLoading(false)
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!user) return null

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Email Not Verified</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please check your email and click the verification link to access your dashboard.
          </p>
          <button
            onClick={async () => {
              await logOut()
              router.push('/login')
            }}
            className="w-full bg-primary-600 hover:bg-primary-400 text-white px-4 py-2 rounded-md transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage your pet tags and account settings
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tags</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Scans</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">0</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Heart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/activate"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                  Activate a New Tag
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Enter your tag code to set up a pet profile
                </p>
              </div>
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <Package className="w-5 h-5 text-primary-600" />
              </div>
            </div>
          </Link>

          <Link
            href="/shop"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                  Order More Tags
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Get additional QR code tags for your pets
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Heart className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </Link>

          <Link
            href="/settings/notifications"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                  Notification Settings
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Configure how you receive scan alerts
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </Link>

          <Link
            href="/resources"
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                  Pet Safety Resources
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Tips and guides for keeping your pet safe
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Heart className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </Link>
        </div>

        {/* PROTECT Plan Upsell */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border-2 border-primary-200 dark:border-primary-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">PROTECT Plan</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get instant alerts when your tag is scanned</p>
                </div>
              </div>
              <ul className="space-y-1.5 mb-3">
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
              <Link href="/protect" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
                Learn more &rarr;
              </Link>
            </div>
            <div className="flex flex-col gap-2 md:min-w-[200px]">
              <button
                onClick={() => handleSubscribe('monthly')}
                disabled={subscribeLoading}
                className="w-full bg-primary-600 hover:bg-primary-400 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {subscribeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '$3/month'}
              </button>
              <button
                onClick={() => handleSubscribe('yearly')}
                disabled={subscribeLoading}
                className="w-full border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {subscribeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span>$30/year <span className="text-primary-400 dark:text-primary-500 text-xs ml-1">Save $6</span></span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* My Tags Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">My Pet Tags</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No tags yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Activate your first tag to start protecting your pet
            </p>
            <Link
              href="/activate"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-400 transition-colors"
            >
              Activate a Tag
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
