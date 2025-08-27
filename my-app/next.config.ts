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
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Handle WebAssembly files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Add fallbacks for Node.js modules and problematic imports
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        os: false,
        url: false,
        querystring: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        constants: false,
        domain: false,
        events: false,
        punycode: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        vm: false,
        // Add specific fallbacks for onnxruntime-web
        'onnxruntime-web': false,
        'onnxruntime-node': false,
      };
    }

    // Handle problematic imports from @imgly/background-removal
    config.resolve.alias = {
      ...config.resolve.alias,
      // Alias problematic imports to empty modules
      'a': false,
      'onnxruntime-web': false,
      'onnxruntime-node': false,
    };

    // Ignore specific modules that cause issues
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^(a|onnxruntime-web|onnxruntime-node)$/,
        contextRegExp: /.*/,
      })
    );

    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  // Add transpilePackages for problematic dependencies
  transpilePackages: ['@imgly/background-removal', 'onnxruntime-web'],
};

export default nextConfig;
