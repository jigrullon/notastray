'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link
                        href="/"
                        className="text-gray-600 hover:text-gray-900 font-medium inline-flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </div>

                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="px-6 py-8 sm:p-10">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                        <p className="text-sm text-gray-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                        <div className="prose prose-blue max-w-none text-gray-600 space-y-6">
                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
                                <p>
                                    Welcome to NotAStray ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy.
                                    This Privacy Policy explains what information we collect, how we use it, and how we keep it safe when you use our pet tag and notification services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
                                <p>We collect personal information that you voluntarily provide to us when you register an account or update your settings. This includes:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><strong>Contact Information:</strong> Your name, email address, and mobile phone number.</li>
                                    <li><strong>Pet Information:</strong> Details about your pets, including their names, descriptions, and medical needs.</li>
                                    <li><strong>Consent Records:</strong> Proof of your consent to receive SMS notifications (e.g., timestamps and IP addresses of consent).</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
                                <p>We use your information strictly to provide and improve our services, including:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Sending immediate alerts via Email and SMS when your pet's tag is scanned.</li>
                                    <li>Managing your account and providing customer support.</li>
                                    <li>Verifying your identity and keeping our services secure.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Storage and Security</h2>
                                <p>
                                    We implement standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.
                                    While no internet service is 100% secure, we strive to use commercially acceptable means to protect your data.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing and Selling</h2>
                                <p className="font-semibold text-gray-900 bg-yellow-50 p-2 rounded-md inline-block">
                                    We do not sell, trade, or rent your personal identification information to third parties.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">6. SMS Notifications</h2>
                                <p>
                                    By consenting to SMS notifications, you agree to receive text messages related to your pet's safety.
                                    You can opt-out of these communications at any time by replying "STOP" to any message or by updating your preferences in the Notification Settings dashboard.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
                                <p>You have the right to:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Access the personal information we hold about you.</li>
                                    <li>Request corrections to any inaccurate data.</li>
                                    <li>Request deletion of your account and all associated data.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact Us</h2>
                                <p>
                                    If you have any questions about this Privacy Policy, please contact us at: <a href="mailto:notastray.support@gmail.com" className="text-primary-600 hover:underline">notastray.support@gmail.com</a>
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
