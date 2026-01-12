/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Add some performance optimizations
  poweredByHeader: false,
  compress: true,
}

module.exports = nextConfig