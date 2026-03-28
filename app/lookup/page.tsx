'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ArrowLeft, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'

declare global {
  interface Window {
    grecaptcha: {
      render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; theme?: string }) => number
      reset: (widgetId: number) => void
    }
    onRecaptchaLoad: () => void
  }
}

export default function LookupPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [captchaVerified, setCaptchaVerified] = useState(false)
  const [captchaLoaded, setCaptchaLoaded] = useState(false)
  const captchaRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<number | null>(null)

  const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      // No reCAPTCHA key configured — skip captcha in dev
      setCaptchaLoaded(true)
      setCaptchaVerified(true)
      return
    }

    // Load reCAPTCHA script
    window.onRecaptchaLoad = () => {
      setCaptchaLoaded(true)
      if (captchaRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.grecaptcha.render(captchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          callback: () => setCaptchaVerified(true),
        })
      }
    }

    if (!document.querySelector('script[src*="recaptcha"]')) {
      const script = document.createElement('script')
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    } else if (window.grecaptcha) {
      window.onRecaptchaLoad()
    }
  }, [RECAPTCHA_SITE_KEY])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmed = code.trim().toUpperCase()

    if (!trimmed) {
      setError('Please enter a tag code.')
      return
    }

    if (!/^[A-Z0-9]{6}$/.test(trimmed)) {
      setError('Tag codes are 6 characters (letters and numbers). Example: ABC123')
      return
    }

    if (!captchaVerified) {
      setError('Please complete the CAPTCHA verification.')
      return
    }

    router.push(`/pet/${trimmed}`)
  }

  return (
    <div className="bg-transparent">
      {/* Header */}
      <section className="bg-brand-cream dark:bg-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4">
            <Link
              href={user ? '/dashboard' : '/'}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </div>
        </div>
      </section>

      {/* Lookup Form */}
      <section className="py-16">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Look Up a Pet
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter the 6-character code from the pet&apos;s tag to view their profile.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code Input */}
            <div>
              <label
                htmlFor="tag-code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Tag Code
              </label>
              <input
                id="tag-code"
                type="text"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6)
                  setCode(val.toUpperCase())
                  setError('')
                }}
                placeholder="ABC123"
                maxLength={6}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-widest text-gray-900 dark:text-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase"
                autoComplete="off"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                The code is printed on the back of the tag
              </p>
            </div>

            {/* CAPTCHA */}
            {RECAPTCHA_SITE_KEY && (
              <div className="flex justify-center">
                <div ref={captchaRef} />
                {!captchaLoaded && (
                  <div className="h-[78px] w-[304px] border border-gray-300 dark:border-gray-600 rounded flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading verification...</p>
                  </div>
                )}
              </div>
            )}

            {!RECAPTCHA_SITE_KEY && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>CAPTCHA skipped (dev mode)</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-primary-600 hover:bg-primary-400 text-white font-medium py-3 rounded-lg transition-colors"
            >
              View Pet Profile
            </button>
          </form>

          {/* Help text */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don&apos;t have a tag yet?{' '}
              <Link href="/shop" className="text-primary-600 hover:text-primary-700 dark:hover:text-primary-400 font-medium">
                Get one here
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
