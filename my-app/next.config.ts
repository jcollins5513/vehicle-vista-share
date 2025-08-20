import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com', // Covers S3 bucket URLs
      },
      {
        protocol: 'https',
        hostname: 'vehicle-vista-media.s3.us-east-2.amazonaws.com', // Your specific S3 bucket
      },
      {
        protocol: 'https',
        hostname: 'www.bentleysupercenter.com',
      },
      {
        protocol: 'https',
        hostname: 'bentleysupercenter.com',
      },
    ],
  },
};

export default nextConfig;
