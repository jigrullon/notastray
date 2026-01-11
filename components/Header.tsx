'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X, Heart } from 'lucide-react'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">NotAStray</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/shop" className="text-gray-600 hover:text-gray-900 font-medium">
              Shop
            </Link>
            <Link href="/resources" className="text-gray-600 hover:text-gray-900 font-medium">
              Resources
            </Link>
            <Link href="/activate" className="btn-outline">
              Activate Tag
            </Link>
            <Link href="/settings/notifications" className="text-gray-600 hover:text-gray-900 font-medium">
              Settings
            </Link>
            <Link href="/login" className="btn-primary">
              Sign In
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4">
              <Link href="/shop" className="text-gray-600 hover:text-gray-900 font-medium">
                Shop
              </Link>
              <Link href="/resources" className="text-gray-600 hover:text-gray-900 font-medium">
                Resources
              </Link>
              <Link href="/activate" className="btn-outline w-full text-center">
                Activate Tag
              </Link>
              <Link href="/settings/notifications" className="text-gray-600 hover:text-gray-900 font-medium">
                Settings
              </Link>
              <Link href="/login" className="btn-primary w-full text-center">
                Sign In
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}