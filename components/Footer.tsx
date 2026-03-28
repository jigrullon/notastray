import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, Facebook } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-brand-cream dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center mb-4">
              <Image
                src="/notastraylogo.png"
                alt="NotAStray - One scan brings them home"
                width={180}
                height={60}
              />
            </Link>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
              Helping lost pets get home faster—just one scan away.
            </p>
            <div className="flex space-x-4 text-gray-500 dark:text-gray-400">
              <a href="mailto:notastray.hq@gmail.com" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors" aria-label="Email us">
                <Mail className="w-5 h-5" />
              </a>
              <a href="tel:+14702107216" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors" aria-label="Call us">
                <Phone className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/profile.php?id=61577464901900" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/shop" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Shop Tags</Link></li>
              <li><Link href="/activate" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Activate Tag</Link></li>
              <li><Link href="/resources" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Resources</Link></li>
              <li><Link href="/support" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Support</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="/resources/setup" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Setup Guide</Link></li>
              <li><Link href="/resources/safety" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Pet Safety</Link></li>
              <li><Link href="/resources/faq" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">FAQ</Link></li>
              <li><Link href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 text-center text-gray-500 dark:text-gray-400">
          <p>&copy; 2026 NotAStray. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
