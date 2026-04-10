'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { ArrowLeft, Shield, MapPin, Bell, Check, Loader2, Info } from 'lucide-react'

export default function ProtectPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState<'monthly' | 'yearly' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setLoading(plan)
    setError(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          userEmail: user?.email ?? undefined,
          userId: user?.uid ?? undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Hero */}
      <section className="bg-brand-cream dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              PROTECT Plan
            </h1>
          </div>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Get instant alerts when someone scans your pet&apos;s tag, so you can act fast and bring them home.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">
            What&apos;s included
          </h2>

          <div className="space-y-6">

            {/* GPS Scan Notifications */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    GPS Tag Scan Notifications
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    When someone scans your pet&apos;s tag, their phone shares their location (with permission) and you receive an alert with a map showing exactly where the scan happened. This is usually right where your pet is.
                  </p>
                </div>
              </div>
            </div>

            {/* Location note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-800 dark:text-blue-300 text-sm">
                <strong>Not a live GPS tracker.</strong> Instead of tracking your pet in real time, you get a notification of the location when someone scans the tag, which is usually exactly where your pet is.
              </p>
            </div>

            {/* Printable Resources */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Printable Lost Pet Resources
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    If your pet goes missing, generate and download a ready-to-share I&apos;M LOST flyer directly from your pet&apos;s profile. Print it, post it, and share it on social media instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Partner Deals */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    Partner Deals
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Access exclusive discounts and deals from our partners, curated for pet owners.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Simple pricing
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-10">
            Cancel any time from your dashboard.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">

            {/* Monthly */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Monthly</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">$3</span>
                <span className="text-gray-500 dark:text-gray-400 mb-1">/month</span>
              </div>
              <ul className="space-y-2 mb-8 flex-1">
                {['GPS scan notifications', 'Printable lost pet flyer', 'Partner deals', 'Cancel any time'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {user ? (
                <button
                  onClick={() => handleSubscribe('monthly')}
                  disabled={loading !== null}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
                >
                  {loading === 'monthly' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe Monthly'}
                </button>
              ) : (
                <Link href="/signup" className="w-full block text-center bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-lg transition-colors">
                  Sign up to subscribe
                </Link>
              )}
            </div>

            {/* Yearly */}
            <div className="bg-white dark:bg-gray-800 border-2 border-primary-400 dark:border-primary-500 rounded-xl p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Best Value
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Yearly</h3>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">$30</span>
                <span className="text-gray-500 dark:text-gray-400 mb-1">/year</span>
              </div>
              <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mb-5">Save $6 vs monthly</p>
              <ul className="space-y-2 mb-8 flex-1">
                {['GPS scan notifications', 'Printable lost pet flyer', 'Partner deals', 'Cancel any time'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {user ? (
                <button
                  onClick={() => handleSubscribe('yearly')}
                  disabled={loading !== null}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
                >
                  {loading === 'yearly' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe Yearly'}
                </button>
              ) : (
                <Link href="/signup" className="w-full block text-center bg-primary-600 hover:bg-primary-500 text-white font-medium py-3 rounded-lg transition-colors">
                  Sign up to subscribe
                </Link>
              )}
            </div>

          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 text-center mb-6">{error}</p>
          )}

          {!user && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 dark:text-primary-400 hover:underline">
                Log in
              </Link>
            </p>
          )}

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
            Have questions?{' '}
            <Link href="/resources/faq" className="text-primary-600 dark:text-primary-400 hover:underline">
              Check out our FAQ
            </Link>
          </p>
        </div>
      </section>

    </div>
  )
}
