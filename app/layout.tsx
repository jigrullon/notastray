import type { Metadata } from 'next'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ErrorBoundary from '@/components/ErrorBoundary'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeProvider'
import { CartProvider } from '@/lib/CartContext'
import CartSlideout from '@/components/CartSlideout'

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
  try {
    var theme = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = theme === 'dark' || (theme === null && prefersDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();`,
          }}
        />
      </head>
      <body className="transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <CartProvider>
              <CartSlideout />
              <ErrorBoundary>
                <Header />
                <main className="min-h-screen">
                  {children}
                </main>
                <Footer />
              </ErrorBoundary>
            </CartProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
