'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle, Loader2, Package, MapPin, ArrowRight, ShoppingBag, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useCart } from '@/lib/CartContext'
import { useAuth } from '@/lib/AuthContext'

interface OrderItem {
  name: string
  color: string
  size: string
  quantity: number
  unitPrice?: number
  price?: number
}

interface ShippingAddress {
  name: string
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface OrderData {
  orderId: string
  confirmationCode: string
  customerEmail: string
  items: OrderItem[]
  subtotal: number
  shippingMethod: string
  shippingCost: number
  total: number
  shippingAddress: ShippingAddress
  estimatedDeliveryMin: string
  estimatedDeliveryMax: string
  status: string
  createdAt: string
}

function getItemPrice(item: OrderItem): number {
  return item.unitPrice ?? item.price ?? 0
}

function formatDeliveryDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function formatDeliveryRange(minDate: string, maxDate: string): string {
  const minParts = new Date(minDate + 'T00:00:00')
  const maxParts = new Date(maxDate + 'T00:00:00')
  const minMonth = minParts.toLocaleDateString('en-US', { month: 'long' })
  const maxMonth = maxParts.toLocaleDateString('en-US', { month: 'long' })
  const year = maxParts.getFullYear()

  if (minMonth === maxMonth) {
    return `${minMonth} ${minParts.getDate()} - ${maxParts.getDate()}, ${year}`
  }
  return `${formatDeliveryDate(minDate)} - ${formatDeliveryDate(maxDate)}, ${year}`
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { clearCart } = useCart()
  const { user } = useAuth()

  const [order, setOrder] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cartCleared = useRef(false)

  useEffect(() => {
    if (!sessionId) {
      setError('No session ID found. Please check your order confirmation email.')
      setLoading(false)
      return
    }

    async function verifyOrder() {
      try {
        const response = await fetch(`/api/orders/verify?session_id=${encodeURIComponent(sessionId!)}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to verify order')
        }

        setOrder(data)

        // Clear the cart once on successful verification
        if (!cartCleared.current) {
          cartCleared.current = true
          clearCart()
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load order details.'
        console.error(err)
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    verifyOrder()
  }, [sessionId, clearCart])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Verifying your order...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-8 max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'Unable to load order details.'}
          </p>
          <Link
            href="/shop"
            className="inline-block bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Order Confirmed!</h1>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-4 mb-1">{order.orderId}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Confirmation code: <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{order.confirmationCode}</span>
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            A confirmation email will be sent to <span className="font-medium text-gray-700 dark:text-gray-300">{order.customerEmail}</span>
          </p>
        </div>

        <div className="space-y-6">

          {/* Order Summary Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
              Order Summary
            </h2>

            <div className="space-y-3 mb-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{item.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{item.color} / {item.size} &middot; Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 flex-shrink-0 ml-4">
                    ${(getItemPrice(item) * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{order.shippingMethod}</span>
                <span>{order.shippingCost > 0 ? `$${order.shippingCost.toFixed(2)}` : 'Free'}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900 dark:text-gray-100 pt-2 border-t border-gray-100 dark:border-gray-700">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
              Shipping Information
            </h2>

            <div className="space-y-1 text-gray-700 dark:text-gray-300">
              <p className="font-medium">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
            </div>

            {order.estimatedDeliveryMin && order.estimatedDeliveryMax && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Delivery</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {formatDeliveryRange(order.estimatedDeliveryMin, order.estimatedDeliveryMax)}
                </p>
              </div>
            )}
          </div>

          {/* What's Next Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400" />
              What&apos;s Next
            </h2>

            <ul className="space-y-3 text-gray-700 dark:text-gray-300">
              <li className="flex items-start">
                <span className="w-6 h-6 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">1</span>
                <span>Your tag will be shipped within 1 business day</span>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">2</span>
                <span>Once received, activate your tag at <span className="font-medium text-primary-600 dark:text-primary-400">notastray.com/activate</span></span>
              </li>
              <li className="flex items-start">
                <span className="w-6 h-6 bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5">3</span>
                <span>Save your confirmation code for your records: <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{order.confirmationCode}</span></span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              href="/activate"
              className="flex-1 bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
            >
              Activate a Tag
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              href="/shop"
              className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
            >
              Back to Shop
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="flex-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-center"
              >
                View Dashboard
              </Link>
            )}
          </div>

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
