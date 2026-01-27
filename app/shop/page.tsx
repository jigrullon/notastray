'use client'

import { Check, Star, Shield, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'

const products = [
  {
    id: 1,
    name: "Classic QR Tag",
    price: 19.99,
    image: "/api/placeholder/300/300",
    features: ["Waterproof", "Durable plastic", "QR code + backup info", "Multiple colors"],
    popular: false
  },
  {
    id: 2,
    name: "Premium Metal Tag",
    price: 29.99,
    image: "/api/placeholder/300/300",
    features: ["Stainless steel", "Laser engraved", "QR code + backup info", "Lifetime warranty"],
    popular: true
  },
  {
    id: 3,
    name: "Smart Tag Pro",
    price: 39.99,
    image: "/api/placeholder/300/300",
    features: ["GPS tracking", "Activity monitoring", "QR code + backup info", "Mobile app"],
    popular: false
  }
]

export default function ShopPage() {
  const { user } = useAuth()

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href={user ? '/dashboard' : '/'}
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose the perfect tag for your pet
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              All tags include QR code technology, profile setup, and lifetime profile updates
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product.id} className="relative bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                {product.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Product Image */}
                  <div className="w-full h-48 bg-gray-100 rounded-lg mb-6 flex items-center justify-center">
                    <div className="w-24 h-24 bg-primary-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-12 h-12 text-white" />
                    </div>
                  </div>

                  {/* Product Info */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{product.name}</h3>
                  <div className="flex items-center mb-4">
                    <span className="text-3xl font-bold text-gray-900">${product.price}</span>
                    <span className="text-gray-500 ml-2">one-time</span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-6">
                    {product.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-gray-600">
                        <Check className="w-4 h-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <Link
                    href={`/shop/checkout?productId=${product.id}`}
                    className={`block w-full text-center py-3 rounded-lg font-medium transition-colors ${product.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}>
                    Buy Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why choose NotAStray?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Built to Last</h3>
              <p className="text-gray-600">
                Waterproof, scratch-resistant, and designed for active pets
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Setup</h3>
              <p className="text-gray-600">
                Get your pet protected in minutes with our simple activation process
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Star className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lifetime Updates</h3>
              <p className="text-gray-600">
                Update your pet's profile anytime - no additional fees ever
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How does the QR code work?
              </h3>
              <p className="text-gray-600">
                Anyone can scan the QR code with their smartphone camera to instantly access your pet's profile page with your contact information.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What if my phone number changes?
              </h3>
              <p className="text-gray-600">
                You can update your contact information anytime through your account dashboard. Changes are reflected immediately on your pet's profile.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Are the tags durable?
              </h3>
              <p className="text-gray-600">
                Yes! All our tags are waterproof and designed to withstand daily wear. The Premium Metal Tag comes with a lifetime warranty.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do I need a smartphone to use this?
              </h3>
              <p className="text-gray-600">
                While QR codes work best with smartphones, each tag also includes backup contact information printed directly on the tag.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}