'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!email) {
      setStatus('error')
      setErrorMessage('No email provided')
      return
    }

    const unsubscribe = async () => {
      try {
        const res = await fetch('/api/newsletter/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: decodeURIComponent(email) }),
        })

        if (!res.ok) {
          throw new Error('Failed to unsubscribe')
        }

        setStatus('success')
      } catch (error: any) {
        setStatus('error')
        setErrorMessage(error.message || 'Something went wrong')
      }
    }

    unsubscribe()
  }, [email])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600 dark:text-gray-400">Processing...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              You've been unsubscribed
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We've removed your email from our newsletter. You won't receive any more emails from us.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
            >
              Back to Home
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {errorMessage}
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition-colors"
            >
              Back to Home
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
