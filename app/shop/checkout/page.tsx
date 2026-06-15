'use client'

import { useState, Suspense, useEffect } from 'react'
import { AlertCircle, Loader2, ShoppingBag, Trash2, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/lib/CartContext'
import { useAuth } from '@/lib/AuthContext'

// COMMENTED OUT: Paid shipping rate type (used if reverting from free shipping)
// interface ShippingRate {
//   service: string
//   cost: number
//   minDays: number
//   maxDays: number
//   displayName: string
//   carrier: string
// }

function CheckoutContent() {
  const { items, removeItem, updateQuantity, subtotal } = useCart()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // COMMENTED OUT: Paid shipping state and fetching (used if reverting from free shipping)
  // const [zipCode, setZipCode] = useState('')
  // const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  // const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null)
  // const [loadingRates, setLoadingRates] = useState(false)
  // const [rateError, setRateError] = useState<string | null>(null)

  // COMMENTED OUT: Fetch shipping rates from ZIP code
  // const fetchShippingRates = async (zip: string) => {
  //   if (!zip || zip.length < 5) return
  //   setLoadingRates(true)
  //   setRateError(null)
  //   try {
  //     const response = await fetch('/api/shipping/rates', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ zipCode: zip }),
  //     })
  //     const data = await response.json()
  //     if (response.ok) {
  //       setShippingRates(data)
  //       setSelectedShippingRate(data.length > 0 ? data[0] : null)
  //     } else {
  //       setRateError(data.error || 'Failed to fetch rates')
  //     }
  //   } catch (err) {
  //     setRateError('Error fetching shipping rates')
  //   } finally {
  //     setLoadingRates(false)
  //   }
  // }

  const handleCheckout = async () => {
    // COMMENTED OUT: Require shipping rate selection (used if reverting from free shipping)
    // if (!selectedShippingRate) {
    //   setError('Please select a shipping option')
    //   return
    // }

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
          // COMMENTED OUT: Include shipping data if using paid rates
          // shippingOption: selectedShippingRate,
          // shippingZipCode: zipCode,
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">

          {/* Order Summary */}
          <div className="md:col-span-3 space-y-6">

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Order Summary</h2>

              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                    <div className="w-14 h-14 rounded-md flex-shrink-0 overflow-hidden">
                      <img src="/enlarged2.jpg" alt="NotAStray Smart Pet Tag" className="w-full h-full object-cover" />
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

              {/* COMMENTED OUT: Shipping rate selection (used if reverting from free shipping)
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">Shipping</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => {
                      const zip = e.target.value.replace(/\D/g, '').slice(0, 5)
                      setZipCode(zip)
                      if (zip.length === 5) {
                        fetchShippingRates(zip)
                      }
                    }}
                    placeholder="Enter 5-digit ZIP code"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {loadingRates && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading rates...
                  </div>
                )}

                {rateError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-md flex items-start">
                    <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" />
                    {rateError}
                  </div>
                )}

                {shippingRates.length > 0 && (
                  <div className="space-y-3">
                    {shippingRates.map((rate, idx) => (
                      <label key={idx} className="flex items-center p-3 border border-gray-200 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShippingRate?.service === rate.service}
                          onChange={() => setSelectedShippingRate(rate)}
                          className="w-4 h-4 text-primary-600"
                        />
                        <span className="ml-3 flex-1">
                          <span className="block font-medium text-gray-900 dark:text-gray-100">
                            {rate.displayName}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ${rate.cost.toFixed(2)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              */}
            </div>

          </div>

          {/* Pricing & Shipping Sidebar */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700 sticky top-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Price Breakdown</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span className="font-medium text-green-600 dark:text-green-400">FREE</span>
                </div>
                <div className="border-t dark:border-gray-700 pt-3 flex justify-between font-bold text-lg text-gray-900 dark:text-gray-100">
                  <span>Due Today</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                Free shipping on all orders within the United States. We&apos;ll collect your shipping address at payment.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-md flex items-start">
                  <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading || items.length === 0}
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
                Secure payment via Stripe.
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
