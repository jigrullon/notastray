
'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Check, Shield, Star, AlertCircle, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const products = [
  {
    id: 1,
    name: "Classic QR Tag",
    price: 19.99,
    image: "/api/placeholder/300/300",
    features: ["Waterproof", "Durable plastic"],
  },
  {
    id: 2,
    name: "Premium Metal Tag",
    price: 29.99,
    image: "/api/placeholder/300/300",
    features: ["Stainless steel", "Laser engraved"],
  },
  {
    id: 3,
    name: "Smart Tag Pro",
    price: 39.99,
    image: "/api/placeholder/300/300",
    features: ["GPS tracking", "Activity monitoring"],
  }
]

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const productId = searchParams.get('productId')
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [includeSubscription, setIncludeSubscription] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (productId) {
      const product = products.find(p => p.id === Number(productId))
      if (product) {
        setSelectedProduct(product)
      }
    }
  }, [productId])

  const subTotal = selectedProduct ? selectedProduct.price : 0
  const subscriptionPrice = 5.00
  const total = subTotal + (includeSubscription ? subscriptionPrice : 0)

  const handleCheckout = async () => {
    setLoading(true)
    setError(null)

    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe failed to initialize.')

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
             // The main product
             {
               name: selectedProduct.name,
               amount: selectedProduct.price,
               quantity: 1,
               currency: 'usd'
             },
             // The subscription upsell
             ...(includeSubscription ? [{
               priceId: 'price_REPLACE_WITH_REAL_ID', // TODO: Make this configurable
               quantity: 1,
               name: 'NotAStray Plus Subscription', // Fallback if priceId invalid in mock
               amount: 5.00 // Fallback for mock
             }] : [])
          ],
          subscription: includeSubscription,
          userEmail: 'guest@example.com', // In a real app, get this from auth
        }),
      })

      const { id: sessionId, url, error: apiError } = await response.json()

      if (apiError) throw new Error(apiError)

      if (url) {
        window.location.href = url
      } else {
        throw new Error('No checkout URL received')
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  if (!selectedProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
             <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
             <p className="text-gray-600 mb-8">Please select a product from the shop.</p>
             <a href="/shop" className="text-primary-600 hover:text-primary-700 font-medium">Return to Shop</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Checkout Content */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Order Summary Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="flex items-center space-x-4 mb-6">
                 <div className="w-16 h-16 bg-gray-100 rounded-md flex items-center justify-center">
                    <Shield className="w-8 h-8 text-gray-400" />
                 </div>
                 <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-500">{selectedProduct.features.join(', ')}</p>
                 </div>
                 <div className="font-semibold text-gray-900">${selectedProduct.price.toFixed(2)}</div>
              </div>

               {/* Upsell Section */}
              <div className={`border rounded-lg p-4 transition-all ${includeSubscription ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}`}>
                <div className="flex items-start space-x-3">
                   <input 
                      type="checkbox" 
                      id="upsell"
                      checked={includeSubscription}
                      onChange={(e) => setIncludeSubscription(e.target.checked)}
                      className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                   />
                   <label htmlFor="upsell" className="flex-1 cursor-pointer">
                      <div className="flex justify-between items-center mb-1">
                         <span className="font-semibold text-gray-900 flex items-center">
                            <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                            NotAStray Plus
                         </span>
                         <span className="text-primary-700 font-bold">$5.00/mo</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Get real-time GPS location when scanned, medical info storage, and instant SMS alerts.
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                         <li className="flex items-center"><Check className="w-3 h-3 mr-1 text-green-500" /> Advanced Location Tracking</li>
                         <li className="flex items-center"><Check className="w-3 h-3 mr-1 text-green-500" /> Detailed Medical Profile</li>
                      </ul>
                   </label>
                </div>
              </div>

            </div>

          </div>

          {/* Sidebar / Totals */}
          <div className="md:col-span-1">
             <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 sticky top-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Total</h3>
                
                <div className="space-y-3 mb-6">
                   <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>${subTotal.toFixed(2)}</span>
                   </div>
                   {includeSubscription && (
                      <div className="flex justify-between text-primary-700 bg-primary-50 p-2 rounded">
                         <span>Plus Subscription</span>
                         <span>$5.00<span className="text-xs">/mo</span></span>
                      </div>
                   )}
                   <div className="border-t pt-3 flex justify-between font-bold text-lg text-gray-900">
                      <span>Due Today</span>
                      <span>${total.toFixed(2)}</span>
                   </div>
                </div>

                {error && (
                   <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start">
                      <AlertCircle className="w-4 h-4 mr-1.5 mt-0.5" />
                      {error}
                   </div>
                )}

                <button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                       <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 
                       Processing...
                    </>
                  ) : (
                    'Proceed to Checkout'
                  )}
                </button>
                
                <p className="mt-4 text-xs text-gray-400 text-center">
                   Secure payment via Stripe. <br /> Subscription can be cancelled anytime.
                </p>

             </div>
          </div>

        </div>
      </div>
    </div>
  )
}
