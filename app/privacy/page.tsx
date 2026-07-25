'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Link
                        href="/"
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium inline-flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
                    <div className="px-6 py-8 sm:p-10">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

                        <div className="prose prose-blue max-w-none text-gray-600 dark:text-gray-400 space-y-6">
                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">1. Introduction</h2>
                                <p>
                                    Welcome to NotAStray (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal information and your right to privacy.
                                    This Privacy Policy explains what information we collect, how we use it, and how we keep it safe when you use our pet tag and notification services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">2. Information We Collect</h2>
                                <p>We collect personal information that you voluntarily provide to us when you register an account or update your settings. This includes:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><strong>Contact Information:</strong> Your name, email address, and mobile phone number.</li>
                                    <li><strong>Pet Information:</strong> Details about your pets, including their names, descriptions, and medical needs.</li>
                                    <li><strong>Consent Records:</strong> Proof of your consent to receive SMS notifications (e.g., timestamps and IP addresses of consent).</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">3. Information You Provide About Others</h2>
                                <p>
                                    Our Rescue Crew feature lets you add emergency contacts to your account — trusted people or safe drop-off locations who can help if your pet goes missing.
                                    This may include the names, phone numbers, and addresses of third parties. When you add someone to your Rescue Crew, you confirm that you have their permission to share their information with us for this purpose.
                                </p>
                                <p className="mt-2">Here is how we handle those details:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li><strong>Limited public display:</strong> Rescue Crew contact details appear on your pet&apos;s public profile page only while that pet is reported lost. At all other times, they are visible only to you as the account owner.</li>
                                    <li><strong>Email kept private:</strong> A contact&apos;s email address is never displayed publicly — it is used solely for your records and any alerts we send on your behalf.</li>
                                    <li><strong>No marketing or selling:</strong> We do not use Rescue Crew contact information for marketing, and we do not sell or share it with third parties.</li>
                                </ul>
                                <p className="mt-2">
                                    If you have been listed as someone&apos;s Rescue Crew contact and would like your information removed, you may request removal at any time by contacting us at <a href="mailto:notastray.support@gmail.com" className="text-primary-600 hover:underline">notastray.support@gmail.com</a>.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">4. How We Use Your Information</h2>
                                <p>We use your information strictly to provide and improve our services, including:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Sending immediate alerts via Email and SMS when your pet&apos;s tag is scanned.</li>
                                    <li>Managing your account and providing customer support.</li>
                                    <li>Verifying your identity and keeping our services secure.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">5. Data Storage and Security</h2>
                                <p>
                                    We implement standard security measures to protect your personal information from unauthorized access, alteration, or disclosure.
                                    While no internet service is 100% secure, we strive to use commercially acceptable means to protect your data.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">6. Data Sharing and Selling</h2>
                                <p className="font-semibold text-gray-900 dark:text-gray-100 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-md inline-block">
                                    We do not sell, trade, or rent your personal identification information to third parties.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">7. SMS Notifications</h2>
                                <p>
                                    By consenting to SMS notifications, you agree to receive text messages related to your pet&apos;s safety.
                                    You can opt-out of these communications at any time by replying &quot;STOP&quot; to any message or by updating your preferences in the Notification Settings dashboard.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">8. Your Rights</h2>
                                <p>You have the right to:</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                    <li>Access the personal information we hold about you.</li>
                                    <li>Request corrections to any inaccurate data.</li>
                                    <li>Request deletion of your account and all associated data.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">9. Contact Us</h2>
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
