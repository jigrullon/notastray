'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, HelpCircle, Mail } from 'lucide-react'

export default function SupportPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <section className="bg-brand-cream dark:bg-gray-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Support
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            We are here to help. Most questions are answered in our FAQ, but feel free to reach out directly any time.
          </p>
        </div>
      </section>

      {/* Cards */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

            {/* FAQ Card */}
            <Link
              href="/resources/faq"
              className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8 hover:shadow-md dark:hover:shadow-gray-900/50 hover:border-primary-300 dark:hover:border-primary-700 transition-all"
            >
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-5">
                <HelpCircle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Browse the FAQ
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-5">
                Answers to the most common questions about tags, the PROTECT membership, lost pets, and more.
              </p>
              <span className="text-primary-600 dark:text-primary-400 font-medium group-hover:underline">
                View FAQ →
              </span>
            </Link>

            {/* Email Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
              <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mb-5">
                <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Email Us
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-5">
                Can&apos;t find what you need? Send us an email and we&apos;ll get back to you as soon as possible.
              </p>
              <a
                href="mailto:notastray.hq@gmail.com"
                className="btn-primary inline-block"
              >
                notastray.hq@gmail.com
              </a>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
