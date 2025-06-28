/** @type {import('next').NextConfig} */
const { join } = require('path');

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'inv.assets.sincrod.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'vehicle-vista-media.s3.us-east-2.amazonaws.com',
      },
    ],
  },

  // Server build optimizations and monorepo support
  experimental: {
    // Important: set root for tracing in monorepo/subdir setups
    outputFileTracingRoot: join(__dirname, '..'),
    disableOptimizedLoading: true,
  },

  // Only needed if you have native dependencies you want to exclude from bundling
  serverExternalPackages: [],

  // Optional: fine-grained excludes if needed (leave out unless troubleshooting again)
  // outputFileTracingExcludes: {
  //   '*': ['**/*'],
  // },
};

// Disable telemetry globally
process.env.NEXT_TELEMETRY_DISABLED = '1';

module.exports = nextConfig;
