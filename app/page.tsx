import Link from 'next/link'
import { Shield, Smartphone, Heart, Users, Clock, MapPin } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="bg-transparent">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-brand-cream dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Keep your pets{' '}
              <span className="text-primary-600 dark:text-primary-400">safe</span>{' '}
              with QR Code tags
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              When your pet goes missing, every second counts. Our QR code tags provide
              instant access to their profile, medical info, and your contact details.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shop" className="btn-primary text-lg px-8 py-3">
                Shop Tags
              </Link>
              <Link href="/activate" className="btn-outline text-lg px-8 py-3">
                Activate Your Tag
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Everything you need to keep pets safe
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Simple, effective, and designed with your pet's safety in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Instant Access</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Anyone can scan the QR code with their phone to instantly access your pet's profile
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Secure & Private</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your contact info is protected. Finders see only what you choose to share
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Heart className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Medical Info</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Include allergies, medications, and vet info for emergency situations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-brand-cream dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              How it works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Get your pet protected in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Order Your Tag</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose from our durable, waterproof tags designed for active pets
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Create Profile</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Use the code on your tag to set up your pet's profile with photos and info
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Stay Protected</h3>
              <p className="text-gray-600 dark:text-gray-400">
                If your pet is found, the finder can scan and contact you immediately
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link href="/resources/faq" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium inline-flex items-center gap-1">
              Have questions? Check out our FAQ
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to protect your pet?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of pet parents who trust NotAStray to keep their furry family safe
          </p>
          <Link href="/shop" className="bg-white text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-200 font-medium py-3 px-8 rounded-lg text-lg transition-colors duration-200">
            Get Started Today
          </Link>
        </div>
      </section>
    </div>
  )
}
