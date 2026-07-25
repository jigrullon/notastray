/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''} https://js.stripe.com https://www.google.com https://www.gstatic.com`,
      "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com",
      "connect-src 'self' https://api.stripe.com https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.sentry.io https://*.ingest.us.sentry.io",
      "img-src 'self' data: https: blob:",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
    ].join('; '),
  },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  compress: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Silence Sentry's build-time logging in CI; still errors loudly on
  // actual upload failures.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Source maps are uploaded for stack-trace resolution but not exposed
  // to end users.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  // Skip the source-map upload step entirely when no auth token is
  // configured (e.g. local dev, or before the Sentry project is set up)
  // instead of failing the build.
  disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
  disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
})
