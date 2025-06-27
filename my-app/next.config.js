/** @type {import('next').NextConfig} */
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
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
  // Disable tracing to fix EPERM error
  outputFileTracingExcludes: {
    '*': ['**/*'],
  },
  // External packages configuration moved from experimental
  serverExternalPackages: [],
  // Disable telemetry
  experimental: {
    disableOptimizedLoading: true,
  },
};

// Disable telemetry via environment variable
process.env.NEXT_TELEMETRY_DISABLED = '1';

module.exports = nextConfig;
