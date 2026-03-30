'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, Sun, Moon, ShoppingCart } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useTheme } from '@/lib/ThemeProvider'
import { useCart } from '@/lib/CartContext'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logOut } = useAuth()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const { itemCount, setIsCartOpen } = useCart()

  const handleSignOut = async () => {
    try {
      await logOut()
      router.push('/')
      setIsMenuOpen(false)
    } catch (error) {
      console.error('Logout failed', error)
    }
  }

  return (
    <header className="bg-brand-cream dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/notastraylogo.png"
              alt="NotAStray - One scan brings them home"
              width={180}
              height={60}
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/shop" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
              Shop
            </Link>
            <Link href="/resources" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
              Resources
            </Link>
            <Link href="/lookup" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
              Lookup
            </Link>
            <Link href="/activate" className="btn-outline">
              Activate Tag
            </Link>
            {user && (
              <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
                Dashboard
              </Link>
            )}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              aria-label="Open cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {user ? (
              <button onClick={handleSignOut} className="btn-primary">
                Sign Out
              </button>
            ) : (
              <Link href="/login" className="btn-primary">
                Sign In
              </Link>
            )}
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
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-4">
              <Link href="/shop" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
                Shop
              </Link>
              <Link href="/resources" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
                Resources
              </Link>
              <Link href="/lookup" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
                Lookup
              </Link>
              <Link href="/activate" className="btn-outline w-full text-center">
                Activate Tag
              </Link>
              {user && (
                <Link href="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 font-medium">
                  Dashboard
                </Link>
              )}
              <button
                onClick={() => { setIsCartOpen(true); setIsMenuOpen(false) }}
                className="relative flex items-center p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                aria-label="Open cart"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Cart
                {itemCount > 0 && (
                  <span className="ml-2 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
              <button
                onClick={toggleTheme}
                className="flex items-center p-2 rounded-lg text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="Toggle dark mode"
              >
                {theme === 'dark' ? <Moon className="w-5 h-5 mr-2" /> : <Sun className="w-5 h-5 mr-2" />}
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </button>
              {user ? (
                <button onClick={handleSignOut} className="btn-primary w-full text-center">
                  Sign Out
                </button>
              ) : (
                <Link href="/login" className="btn-primary w-full text-center">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
