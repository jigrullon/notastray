'use client'

import { useState, Suspense, useEffect } from 'react'
import { AlertCircle, Loader2, ShoppingBag, Trash2, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/lib/CartContext'
import { useAuth } from '@/lib/AuthContext'

interface ShippingRate {
  service: string
  cost: number
  minDays: number
  maxDays: number
  displayName: string
}

function CheckoutContent() {
  const { items, removeItem, updateQuantity, subtotal } = useCart()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shippingZipCode, setShippingZipCode] = useState('')
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([])
  const [selectedShippingRate, setSelectedShippingRate] = useState<ShippingRate | null>(null)
  const [loadingRates, setLoadingRates] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  // Fetch shipping rates when ZIP code changes
  const handleZipCodeChange = async (zipCode: string) => {
    setShippingZipCode(zipCode)
    setSelectedShippingRate(null)
    setShippingError(null)

    if (!zipCode || zipCode.length < 5) {
      setShippingRates([])
      return
    }

    setLoadingRates(true)
    try {
      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          destinationZip: zipCode,
          items: items.map((item) => ({ quantity: item.quantity })),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate shipping rates')
      }

      setShippingRates(data.rates || [])
      // Auto-select the first rate
      if (data.rates && data.rates.length > 0) {
        setSelectedShippingRate(data.rates[0])
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to calculate shipping rates'
      console.error(err)
      setShippingError(message)
      setShippingRates([])
    } finally {
      setLoadingRates(false)
    }
  }

  const handleCheckout = async () => {
    if (!selectedShippingRate) {
      setError('Please select a shipping option')
      return
    }

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
          shippingOption: selectedShippingRate,
          shippingZipCode,
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
            </div>

          </div>

          {/* Pricing & Shipping Sidebar */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 p-6 border border-gray-100 dark:border-gray-700 sticky top-6">
              {/* Shipping Address */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={shippingZipCode}
                  onChange={(e) => handleZipCodeChange(e.target.value)}
                  placeholder="Enter 5-digit ZIP"
                  maxLength={5}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {shippingError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{shippingError}</p>
                )}
              </div>

              {/* Shipping Options */}
              {shippingZipCode && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Shipping Method</h4>
                    <Link href="/shipping-returns" className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline">
                      Learn more
                    </Link>
                  </div>
                  {loadingRates ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-600 mr-2" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Calculating rates...</span>
                    </div>
                  ) : shippingRates.length > 0 ? (
                    <div className="space-y-2">
                      {shippingRates.map((rate) => (
                        <label key={rate.service} className="flex items-start p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <input
                            type="radio"
                            name="shipping"
                            value={rate.service}
                            checked={selectedShippingRate?.service === rate.service}
                            onChange={() => setSelectedShippingRate(rate)}
                            className="mt-1 w-4 h-4 text-primary-600"
                          />
                          <div className="ml-3 flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{rate.displayName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">${rate.cost.toFixed(2)}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Price Breakdown</h3>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span>${selectedShippingRate ? selectedShippingRate.cost.toFixed(2) : '—'}</span>
                </div>
                <div className="border-t dark:border-gray-700 pt-3 flex justify-between font-bold text-lg text-gray-900 dark:text-gray-100">
                  <span>Due Today</span>
                  <span>${selectedShippingRate ? (subtotal + selectedShippingRate.cost).toFixed(2) : subtotal.toFixed(2)}</span>
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
                disabled={loading || !selectedShippingRate}
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
