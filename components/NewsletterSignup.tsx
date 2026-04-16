'use client'

import { useState } from 'react'
import { Mail, CheckCircle, Loader2 } from 'lucide-react'

type Variant = 'full' | 'compact'
type Status = 'idle' | 'loading' | 'success' | 'error'

interface NewsletterSignupProps {
    variant?: Variant
}

export default function NewsletterSignup({ variant = 'full' }: NewsletterSignupProps) {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<Status>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        if (!email.trim() || !email.includes('@')) {
            setStatus('error')
            setErrorMessage('Please enter a valid email address.')
            return
        }

        setStatus('loading')
        setErrorMessage('')

        try {
            const source = variant === 'full' ? 'homepage_form' : 'footer_form'
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), source }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Something went wrong. Please try again.')
            }

            setStatus('success')
            setEmail('')
        } catch (err: any) {
            setStatus('error')
            setErrorMessage(err.message || 'Something went wrong. Please try again.')
        }
    }

    if (variant === 'compact') {
        return (
            <div className="w-full">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Stay in the loop</p>
                {status === 'success' ? (
                    <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>You&apos;re subscribed! Thanks for joining.</span>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleSubmit} className="flex gap-2">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value)
                                    if (status === 'error') setStatus('idle')
                                }}
                                placeholder="Your email address"
                                disabled={status === 'loading'}
                                className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                            />
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="flex-shrink-0 px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {status === 'loading' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    'Subscribe'
                                )}
                            </button>
                        </form>
                        {status === 'error' && errorMessage && (
                            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{errorMessage}</p>
                        )}
                        <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                            We never sell or share your information.
                        </p>
                    </>
                )}
            </div>
        )
    }

    // Full variant
    return (
        <div className="max-w-2xl mx-auto text-center">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Stay in the loop
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Get pet safety tips, product updates, and exclusive offers — straight to your inbox.
            </p>

            {status === 'success' ? (
                <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        You&apos;re subscribed!
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                        Thanks for joining. We&apos;ll be in touch with tips and updates.
                    </p>
                </div>
            ) : (
                <>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                if (status === 'error') setStatus('idle')
                            }}
                            placeholder="Enter your email address"
                            disabled={status === 'loading'}
                            className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-60"
                        />
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="px-6 py-3 font-medium bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            {status === 'loading' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Subscribing...
                                </>
                            ) : (
                                'Subscribe'
                            )}
                        </button>
                    </form>
                    {status === 'error' && errorMessage && (
                        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                    )}
                    <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">
                        We never sell or share your information. Unsubscribe anytime.
                    </p>
                </>
            )}
        </div>
    )
}
