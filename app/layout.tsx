import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ErrorBoundary from '@/components/ErrorBoundary'
import { AuthProvider } from '@/lib/AuthContext'

export const metadata: Metadata = {
  title: 'NotAStray - Smart Pet ID Tags',
  description: 'Keep your pets safe with smart QR code ID tags. Instant access to pet profiles when they need help most.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ErrorBoundary>
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
          </ErrorBoundary>
        </AuthProvider>
      </body>
    </html>
  )
}