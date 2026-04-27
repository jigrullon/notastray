'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore'
import { Loader2, Package, Settings, Heart, Shield, Check, QrCode } from 'lucide-react'
import Link from 'next/link'

interface SubscriptionData {
  status: 'active' | 'canceled' | 'past_due' | 'none'
  plan?: 'monthly' | 'yearly'
  stripeSubscriptionId?: string
  currentPeriodEnd?: string
}

interface TagData {
  code: string
  petName: string
  isActive: boolean
  isLost: boolean
  activatedAt?: string
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-cream dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading, logOut } = useAuth()
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionData>({ status: 'none' })
  const [subLoading, setSubLoading] = useState(true)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
  const [tags, setTags] = useState<TagData[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fetch user's tags from Firestore
  useEffect(() => {
    async function fetchTags() {
      if (!user) return
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        const tagCodes: string[] = userDoc.exists() ? (userDoc.data().tagCodes || []) : []
        if (tagCodes.length === 0) {
          setTags([])
          return
        }

        // Fetch tag documents in batches of 10 (Firestore 'in' query limit)
        const allTags: TagData[] = []
        for (let i = 0; i < tagCodes.length; i += 10) {
          const batch = tagCodes.slice(i, i + 10)
          const tagsQuery = query(collection(db, 'tags'), where(documentId(), 'in', batch))
          const snapshot = await getDocs(tagsQuery)
          snapshot.forEach(tagDoc => {
            const data = tagDoc.data()
            allTags.push({
              code: tagDoc.id,
              petName: data.pet?.name || 'Unnamed',
              isActive: data.isActive || false,
              isLost: data.isLost || false,
              activatedAt: data.activatedAt || undefined,
            })
          })
        }
        setTags(allTags)
      } catch (err) {
        console.error('Error fetching tags:', err)
      } finally {
        setTagsLoading(false)
      }
    }
    if (user) fetchTags()
  }, [user])

  // Fetch subscription status via API (checks Firestore + Stripe)
  useEffect(() => {
    async function fetchSubscription() {
      if (!user) return
      try {
        const response = await fetch('/api/subscribe/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: user.email,
            userId: user.uid,
          }),
        })
        const data = await response.json()
        if (data.status === 'active') {
          setSubscription({
            status: 'active',
            plan: data.plan || 'monthly',
            stripeSubscriptionId: data.stripeSubscriptionId,
            currentPeriodEnd: data.currentPeriodEnd,
          })
          return true
        }
        return false
      } catch (err) {
        console.error('Error fetching subscription:', err)
        return false
      } finally {
        setSubLoading(false)
      }
    }

    if (user) {
      const justSubscribed = searchParams.get('subscribed') === 'true'
      if (justSubscribed) {
        // Webhook may not have fired yet — poll a few times
        let attempts = 0
        const poll = async () => {
          const found = await fetchSubscription()
          if (!found && attempts < 5) {
            attempts++
            setTimeout(poll, 2000)
          }
          if (found) {
            router.replace('/dashboard', { scroll: false })
          }
        }
        poll()
      } else {
        fetchSubscription()
      }
    }
  }, [user, searchParams, router])

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    if (isSubscribed) return
    setSubscribeLoading(true)
    setSubscribeError(null)
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
        setSubscribeError(data.error || 'Something went wrong. Please try again.')
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('Subscribe error:', err)
      setSubscribeError('Something went wrong. Please try again.')
    } finally {
      setSubscribeLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!subscription.stripeSubscriptionId) return
    if (!confirm('Are you sure you want to cancel your PROTECT plan? You will lose access to SMS/Email alerts and advanced features.')) return

    setCancelLoading(true)
    try {
      const response = await fetch('/api/subscribe/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId,
        }),
      })
      const data = await response.json()
      if (data.status === 'canceled') {
        // Re-fetch true status — other active subs may still exist
        const statusRes = await fetch('/api/subscribe/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: user?.email, userId: user?.uid }),
        })
        const statusData = await statusRes.json()
        if (statusData.status === 'active') {
          setSubscription({
            status: 'active',
            plan: statusData.plan || 'monthly',
            stripeSubscriptionId: statusData.stripeSubscriptionId,
            currentPeriodEnd: statusData.currentPeriodEnd,
          })
        } else {
          setSubscription({ status: 'none' })
        }
      }
    } catch (err) {
      console.error('Cancel error:', err)
    } finally {
      setCancelLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!user) return null

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-cream dark:bg-gray-900 p-4">
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

  const isSubscribed = subscription.status === 'active'

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-gray-900">

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome back{user?.displayName ? `, ${user.displayName}` : ''}!
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your pet tags and account settings
            </p>
          </div>
          {isSubscribed && (
            <div className="flex items-center gap-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-4 py-2 rounded-full text-sm font-medium">
              <Shield className="w-4 h-4" />
              PROTECT Plan Active
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tags</p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{tags.filter(t => t.isActive).length}</p>
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

        {/* PROTECT Plan Section */}
        {!subLoading && (
          <div className="mt-8">
            {isSubscribed ? (
              /* Active Subscription Card */
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-primary-200 dark:border-primary-800 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mr-3">
                      <Shield className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        You&apos;re Subscribed!
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        PROTECT Plan &middot; {subscription.plan === 'yearly' ? 'Annual ($30/year)' : 'Monthly ($3/month)'}
                      </p>
                      {subscription.currentPeriodEnd && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Next renewal: {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium">
                      <Check className="w-3 h-3" />
                      Active
                    </span>
                    <button
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cancel plan'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Upsell Card */
              <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-primary-200 dark:border-primary-800 p-6">
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
                    {subscribeError && (
                      <p className="text-sm text-red-600 dark:text-red-400 text-center">{subscribeError}</p>
                    )}
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
            )}
          </div>
        )}

        {/* My Tags Section */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Pet Tags</h2>
            <Link
              href="/activate"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-400 transition-colors"
            >
              Activate a Tag
            </Link>
          </div>

          {tagsLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
            </div>
          ) : tags.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tags.map(tag => (
                <div
                  key={tag.code}
                  className={`bg-white dark:bg-gray-800 rounded-lg border p-5 transition-all flex flex-col ${
                    tag.isLost
                      ? 'border-orange-300 dark:border-orange-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:shadow-md'
                  }`}
                >
                  <Link href={`/pet/${tag.code}`} className="group flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0">
                      <QrCode className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 transition-colors">
                        {tag.petName}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{tag.code}</p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      tag.isActive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {tag.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {tag.isLost && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                        Lost
                      </span>
                    )}
                    {tag.activatedAt && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                        {new Date(tag.activatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="mt-auto">
                    {tag.isActive && !tag.isLost && (
                      <Link
                        href={`/report-lost/${tag.code}`}
                        className="w-full text-center block px-3 py-1.5 rounded-md text-xs font-medium border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        Report Lost
                      </Link>
                    )}
                    {tag.isLost && (
                      <p className="text-xs text-center text-orange-600 dark:text-orange-400 font-medium">
                        Marked as lost — visit the pet profile to mark found.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
