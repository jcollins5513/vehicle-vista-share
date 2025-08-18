/** @type {import('next').NextConfig} */
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'inv.assets.sincrod.com' },
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: 'vehicle-vista-media.s3.us-east-2.amazonaws.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.bentleysupercenter.com' },
      { protocol: 'https', hostname: 'bentleysupercenter.com' },
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

export default nextConfig;
