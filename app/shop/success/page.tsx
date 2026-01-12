
'use client'

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (sessionId) {
      console.log('Payment successful session:', sessionId)
      // verifyTransaction(sessionId) // Optional: Verification call to backend
    }
  }, [sessionId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center border border-gray-100">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. We have sent a confirmation email with your order details.
        </p>

        <div className="space-y-4">
          <Link 
            href="/settings" 
            className="block w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
          
          <Link 
            href="/shop" 
            className="block w-full text-gray-600 hover:text-gray-900 font-medium"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  )
}
