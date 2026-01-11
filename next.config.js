/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove experimental.appDir as it's stable in Next.js 14
  webpack: (config, { dev, isServer }) => {
    // Fix for chunk loading issues in development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks.cacheGroups,
            default: false,
            vendors: false,
            // Create a chunk for framework libraries
            framework: {
              chunks: 'all',
              name: 'framework',
              test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
              priority: 40,
              enforce: true,
            },
          },
        },
      }
    }
    return config
  },
  // Add some performance optimizations
  poweredByHeader: false,
  compress: true,
}

module.exports = nextConfig