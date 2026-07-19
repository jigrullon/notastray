'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import {
  Loader2,
  ArrowLeft,
  QrCode,
  Eye,
  MessageSquare,
  Mail,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import Link from 'next/link'

interface ScanEvent {
  id: string
  tagCode: string
  petName: string
  timestamp: string
  type: 'qr_scan' | 'profile_view'
  location: string | null
  notifiedSms: boolean
  notifiedEmail: boolean
  rateLimited: boolean
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const faqs: { question: string; answer: React.ReactNode }[] = [
  {
    question: "I'm not seeing anything. Why not?",
    answer: (
      <p>
        This page only fills in once one of your tags is actually used. If it&apos;s empty, none of
        your tags have been scanned or had their profile viewed yet. As soon as someone scans a tag
        or opens a pet profile, the event will show up here.
      </p>
    ),
  },
  {
    question: 'Why do I keep getting alerts when my pet is right next to me?',
    answer: (
      <p>
        Every time your pet&apos;s profile page loads, it counts as a new profile view and sends a
        fresh alert. If a phone has that page open in a browser tab and the browser reloads or
        restores its saved tabs later, that reload registers as a brand-new view and re-triggers an
        SMS/email alert — even if nobody scanned the tag again. Closing the tab after viewing the
        profile prevents these repeat alerts.
      </p>
    ),
  },
  {
    question: 'How accurate is the location shown?',
    answer: (
      <>
        <p>NotAStray uses a three-tier approach to figure out where a scan or view happened:</p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-gray-700 dark:text-gray-300">
          <li>
            <strong>GPS</strong> — the most accurate. This requires the visitor to grant location
            permission on their device.
          </li>
          <li>
            <strong>IP-based approximate location</strong> — a fallback used when GPS isn&apos;t
            granted. It&apos;s roughly city-level and needs no permission.
          </li>
          <li>
            <strong>No location</strong> — if neither is available, the event still records, just
            without a location.
          </li>
        </ul>
        <p className="mt-3">
          NotAStray does not display or store the visitor&apos;s raw IP address anywhere — only the
          approximate location it resolves to.
        </p>
      </>
    ),
  },
  {
    question: "Does someone call me when my pet's tag is scanned?",
    answer: (
      <p>
        No — NotAStray has no phone call-center service. When your tag is scanned or your pet&apos;s
        profile is viewed, we deliver an alert instantly via SMS and/or email, based on the channels
        you&apos;ve turned on in your{' '}
        <Link
          href="/settings/notifications"
          className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          notification settings
        </Link>
        .
      </p>
    ),
  },
]

function FaqItem({ question, answer }: { question: string; answer: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <span className="font-semibold text-gray-900 dark:text-gray-100 pr-4">{question}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-primary-600 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-6 py-5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-brand-cream dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    }>
      <ActivityContent />
    </Suspense>
  )
}

function ActivityContent() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [events, setEvents] = useState<ScanEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchEvents() {
      if (!user) return
      setEventsLoading(true)
      setError(null)
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/scan-events', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          setError('We couldn\'t load your tag activity. Please try again in a moment.')
          return
        }
        const data = await response.json()
        setEvents(Array.isArray(data.events) ? data.events : [])
      } catch (err) {
        console.error('Error fetching scan events:', err)
        setError('We couldn\'t load your tag activity. Please try again in a moment.')
      } finally {
        setEventsLoading(false)
      }
    }
    if (user) fetchEvents()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cream dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-brand-cream dark:bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tag Activity</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Every time one of your tags is scanned or your pet&apos;s profile is viewed, it shows up
            here — along with the instant SMS/email alert we sent you.
          </p>
        </div>

        {/* Event-type legend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            What these events mean
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center shrink-0">
                <QrCode className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">QR Scan</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Someone scanned the QR code on your pet&apos;s physical tag with their phone,
                  opening your pet&apos;s profile and triggering an instant SMS/email alert to you.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Profile View</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Someone reached your pet&apos;s profile without scanning the tag directly (for
                  example, a shared link or our tag lookup page) — this also triggers an instant
                  SMS/email alert to you.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Events */}
        {eventsLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800 p-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No activity yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              None of your tags have been scanned or viewed.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Tag
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Pet
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      Notified
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {events.map(event => (
                    <tr key={event.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {formatTime(event.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        {event.tagCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {event.petName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {event.type === 'qr_scan' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                            QR Scan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            Profile View
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {event.location ? (
                          <span className="text-gray-700 dark:text-gray-300">{event.location}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Location unavailable</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {event.rateLimited ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            Rate limited — no alert sent
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <MessageSquare
                              className={`w-4 h-4 ${
                                event.notifiedSms
                                  ? 'text-green-600'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                              aria-label={event.notifiedSms ? 'SMS sent' : 'SMS not sent'}
                            />
                            <Mail
                              className={`w-4 h-4 ${
                                event.notifiedEmail
                                  ? 'text-green-600'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                              aria-label={event.notifiedEmail ? 'Email sent' : 'Email not sent'}
                            />
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map(item => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
