/** @type {import('next').NextConfig} */
const { join } = require('path');

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'inv.assets.sincrod.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: 'vehicle-vista-media.s3.us-east-2.amazonaws.com' },
    ],
  },

  // ✅ Corrected: move this outside experimental
  outputFileTracingRoot: join(__dirname, '..'),

  // Experimental features
  experimental: {
    disableOptimizedLoading: true,
  },

  serverExternalPackages: [],
};

process.env.NEXT_TELEMETRY_DISABLED = '1';

module.exports = nextConfig;
