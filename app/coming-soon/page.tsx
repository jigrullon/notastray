import Image from 'next/image'
import { Heart } from 'lucide-react'

export const metadata = {
  title: 'NotAStray - Coming Soon',
  description: 'Smart pet ID tags that help bring lost pets home. Coming soon!',
}

export default function ComingSoonPage() {
  return (
    <div className="fixed inset-0 z-[60] bg-brand-cream flex items-center justify-center">
      <div className="max-w-lg mx-auto px-6 text-center">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src="/notastraylogo.png"
            alt="NotAStray"
            width={220}
            height={73}
            priority
            className="mx-auto"
          />
        </div>

        {/* Icon accent */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Heart className="w-8 h-8 text-primary-600" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
          Something paw-some is coming
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
          We&apos;re building smart pet tags that help bring lost pets home.
          One scan is all it takes to reunite a pet with their family.
        </p>

        {/* Divider */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-12 bg-gray-300" />
          <span className="text-sm text-gray-400 font-medium">Stay tuned</span>
          <div className="h-px w-12 bg-gray-300" />
        </div>

        {/* Footer note */}
        <p className="text-sm text-gray-500">
          &copy; 2026 NotAStray. All rights reserved.
        </p>
      </div>
    </div>
  )
}
