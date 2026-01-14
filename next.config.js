/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages compatibility
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Add some performance optimizations
  poweredByHeader: false,
  compress: true,
  // Disable server-side features for static export
  trailingSlash: true,
}

module.exports = nextConfig