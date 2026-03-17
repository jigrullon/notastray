'use client'

import { useState } from 'react'
import { Check, Star, Shield, Zap, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/AuthContext'
import ImageZoom from '@/components/ImageZoom'

const productImages = [
  { src: '', alt: 'NotAStray Smart Pet Tag - Main product image' },
  { src: '/sizes.jpeg', alt: 'NotAStray Smart Pet Tag - Size reference' },
  { src: '/size-penny.jpeg', alt: 'NotAStray Smart Pet Tag - Size compared to penny' },
  { src: '/colors.jpeg', alt: 'NotAStray Smart Pet Tag - Available colors' },
]

const colorOptions = ['Red', 'Blue', 'Pink', 'Teal', 'Black']
const sizeOptions = ['Small', 'Medium', 'Large']

const featureBullets = [
  'Waterproof',
  'QR code technology',
  'Instant SMS/Email alerts',
  'Lifetime profile updates',
]

export default function ShopPage() {
  const { user } = useAuth()
  const [selectedColor, setSelectedColor] = useState(colorOptions[0])
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0])

  return (
    <div className="bg-transparent">
      {/* Back Button & Header */}
      <section className="bg-gradient-to-b from-gray-50 to-brand-cream py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link
              href={user ? '/dashboard' : '/'}
              className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </div>
        </div>
      </section>

      {/* Product Detail Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
            {/* Left Column - Image Gallery */}
            <div>
              <ImageZoom images={productImages} />
            </div>

            {/* Right Column - Product Info */}
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                NotAStray Smart Pet Tag
              </h1>

              <p className="text-3xl font-bold text-primary-600 mb-6">
                $14.95
              </p>

              {/* Color Selector */}
              <div className="mb-4">
                <label
                  htmlFor="color-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Color
                </label>
                <select
                  id="color-select"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </div>

              {/* Size Selector */}
              <div className="mb-6">
                <label
                  htmlFor="size-select"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Size
                </label>
                <select
                  id="size-select"
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {sizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buy Now Button */}
              <Link
                href={`/shop/checkout?color=${encodeURIComponent(selectedColor)}&size=${encodeURIComponent(selectedSize)}`}
                className="block w-full text-center py-3 rounded-lg font-medium transition-colors bg-primary-600 hover:bg-primary-400 text-white mb-8"
              >
                Buy Now
              </Link>

              {/* Feature Bullets */}
              <ul className="space-y-3">
                {featureBullets.map((feature) => (
                  <li key={feature} className="flex items-center text-gray-700">
                    <Check className="w-5 h-5 text-green-500 mr-3 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose NotAStray Section */}
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
                Update your pet&apos;s profile anytime - no additional fees ever
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
                Anyone can scan the QR code with their smartphone camera to instantly access your pet&apos;s profile page with your contact information.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What if my phone number changes?
              </h3>
              <p className="text-gray-600">
                You can update your contact information anytime through your account dashboard. Changes are reflected immediately on your pet&apos;s profile.
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
