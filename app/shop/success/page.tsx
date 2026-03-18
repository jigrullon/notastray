'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      console.log('Payment successful session:', sessionId)
      // verifyTransaction(sessionId) // Optional: Verification call to backend
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Thank you for your purchase. We have sent a confirmation email with your order details.
        </p>

        <div className="space-y-4">
          <Link
            href="/settings"
            className="block w-full bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>

          <Link
            href="/shop"
            className="block w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
          >
            Shop Again
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
