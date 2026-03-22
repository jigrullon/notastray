'use client'

import { useState, Suspense } from 'react'
import { Check, Shield, Star, AlertCircle, Loader2, ShoppingBag, Trash2, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/lib/CartContext'
import { useAuth } from '@/lib/AuthContext'

function CheckoutContent() {
  const { items, removeItem, updateQuantity, subtotal } = useCart()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [includeSubscription, setIncludeSubscription] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subscriptionPrice = 5.00

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            name: item.name,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          })),
          userEmail: user?.email || undefined,
          userId: user?.uid || undefined,
          includeSubscription,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      console.error(err)
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  // Empty cart state
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your cart is empty</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add some tags to your cart to get started.
          </p>
          <Link
            href="/shop"
            className="inline-block bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Browse Shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Order Summary */}
          <div className="md:col-span-2 space-y-6">

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                      <Shield className="w-7 h-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.color} / {item.size}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-100">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded-md border border-gray-200 dark:border-gray-600 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">${item.price.toFixed(2)} each</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* NotAStray Plus Upsell */}
            <div className={`border rounded-lg p-4 transition-all ${includeSubscription ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 bg-white dark:bg-gray-800'}`}>
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="upsell"
                  checked={includeSubscription}
                  onChange={(e) => setIncludeSubscription(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <label htmlFor="upsell" className="flex-1 cursor-pointer">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                      <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                      NotAStray Plus
                    </span>
                    <span className="text-primary-700 dark:text-primary-400 font-bold">$5.00/mo</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Get real-time GPS location when scanned, medical info storage, and instant SMS alerts.
                  </p>
                  <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <li className="flex items-center"><Check className="w-3 h-3 mr-1 text-green-500" /> Advanced Location Tracking</li>
                    <li className="flex items-center"><Check className="w-3 h-3 mr-1 text-green-500" /> Detailed Medical Profile</li>
                  </ul>
                </label>
              </div>
            </div>

          </div>

          {/* Pricing Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700 sticky top-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Price Breakdown</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                  <span>Shipping</span>
                  <span className="italic">Calculated at checkout</span>
                </div>
                {includeSubscription && (
                  <div className="flex justify-between text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 p-2 rounded">
                    <span>Plus Subscription</span>
                    <span>$5.00<span className="text-xs">/mo</span></span>
                  </div>
                )}
                <div className="border-t dark:border-gray-700 pt-3 flex justify-between font-bold text-lg text-gray-900 dark:text-gray-100">
                  <span>Due Today</span>
                  <span>${(subtotal + (includeSubscription ? subscriptionPrice : 0)).toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-md flex items-start">
                  <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </button>

              <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                Secure payment via Stripe. <br /> Subscription can be cancelled anytime.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
