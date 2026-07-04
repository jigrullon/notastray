'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import { CheckCircle, AlertCircle, Clock, Loader2, Heart } from 'lucide-react'

type VerifyState =
  | 'verifying'
  | 'success'
  | 'expired'
  | 'invalid'

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [state, setState] = useState<VerifyState>('verifying')
  const [hasSession, setHasSession] = useState(false)
  const [continueTo, setContinueTo] = useState('/dashboard')

  // Resend feedback (expired state)
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  // Guard against React strict-mode double effect invocation
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const token = searchParams.get('token')
    if (!token) {
      setState('invalid')
      return
    }

    // Strip the token from the address bar once consumed so it doesn't
    // linger in browser history, screenshots, or copied URLs.
    window.history.replaceState(null, '', '/verify-email')

    const verify = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json().catch(() => ({}))

        if (res.ok && data.success) {
          const dest = typeof data.continue === 'string' ? data.continue : '/dashboard'
          setContinueTo(dest)
          setState('success')

          // If a session exists, refresh the user's claims so the app sees emailVerified.
          const current = auth.currentUser
          if (current) {
            setHasSession(true)
            try {
              await current.reload()
              await current.getIdToken(true)
            } catch (reloadErr) {
              console.error('verify-email: failed to reload user', reloadErr)
            }
            // Auto-redirect after a short beat.
            setTimeout(() => {
              router.push(dest)
            }, 2000)
          }
          return
        }

        // Non-success responses
        if (data.reason === 'expired') {
          setState('expired')
        } else {
          setState('invalid')
        }
      } catch (err) {
        console.error('verify-email: request failed', err)
        setState('invalid')
      }
    }

    verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleResend = async () => {
    const current = auth.currentUser
    if (!current) return

    setResendState('sending')
    setResendMessage(null)
    try {
      const idToken = await current.getIdToken()
      const res = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      })
      if (res.status === 429) {
        setResendState('error')
        setResendMessage('Too many requests. Please wait a few minutes before trying again.')
        return
      }
      if (!res.ok) {
        setResendState('error')
        setResendMessage('Could not send a new verification email. Please try again.')
        return
      }
      setResendState('sent')
      setResendMessage('A new verification email is on its way. Check your inbox.')
    } catch (err) {
      console.error('verify-email: resend failed', err)
      setResendState('error')
      setResendMessage('Could not send a new verification email. Please try again.')
    }
  }

  const signedIn = !!auth.currentUser

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center space-x-2">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">NotAStray</span>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-200 dark:border-gray-700 text-center">

          {state === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Verifying your email…
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Hang tight while we confirm your email address.
              </p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Email verified!
              </h2>
              {hasSession ? (
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your email address has been confirmed. Redirecting you now…
                </p>
              ) : (
                <>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Your email address has been confirmed. Sign in to continue.
                  </p>
                  <Link href="/login" className="btn-primary inline-block">
                    Sign in
                  </Link>
                </>
              )}
            </>
          )}

          {state === 'expired' && (
            <>
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Link expired
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This verification link has expired. Verification links are valid for 24 hours.
              </p>

              {signedIn ? (
                <>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendState === 'sending' || resendState === 'sent'}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendState === 'sending' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending…
                      </>
                    ) : resendState === 'sent' ? (
                      'Email sent'
                    ) : (
                      'Resend verification email'
                    )}
                  </button>
                  {resendMessage && (
                    <p
                      className={`mt-4 text-sm ${
                        resendState === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {resendMessage}
                    </p>
                  )}
                </>
              ) : (
                <Link href="/login" className="btn-primary inline-block">
                  Sign in to request a new link
                </Link>
              )}
            </>
          )}

          {state === 'invalid' && (
            <>
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Verification failed
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                This verification link is invalid or has already been used.
              </p>
              <div className="flex flex-col gap-3">
                <Link href="/login" className="btn-primary inline-block">
                  Go to Sign in
                </Link>
                <Link
                  href="/support"
                  className="text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  Contact support
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
