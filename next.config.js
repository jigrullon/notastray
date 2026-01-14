/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

module.exports = nextConfig