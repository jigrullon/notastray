import Link from 'next/link'
import { Heart, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">NotAStray</span>
            </Link>
            <p className="text-gray-600 mb-4 max-w-md">
              Keeping pets safe with smart QR code ID tags. When your pet is found, 
              their profile is just a scan away.
            </p>
            <div className="flex space-x-4 text-gray-500">
              <Mail className="w-5 h-5" />
              <Phone className="w-5 h-5" />
              <MapPin className="w-5 h-5" />
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/shop" className="text-gray-600 hover:text-gray-900">Shop Tags</Link></li>
              <li><Link href="/activate" className="text-gray-600 hover:text-gray-900">Activate Tag</Link></li>
              <li><Link href="/resources" className="text-gray-600 hover:text-gray-900">Resources</Link></li>
              <li><Link href="/support" className="text-gray-600 hover:text-gray-900">Support</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="/resources/setup" className="text-gray-600 hover:text-gray-900">Setup Guide</Link></li>
              <li><Link href="/resources/safety" className="text-gray-600 hover:text-gray-900">Pet Safety</Link></li>
              <li><Link href="/resources/faq" className="text-gray-600 hover:text-gray-900">FAQ</Link></li>
              <li><Link href="/privacy" className="text-gray-600 hover:text-gray-900">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-500">
          <p>&copy; 2024 NotAStray. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}