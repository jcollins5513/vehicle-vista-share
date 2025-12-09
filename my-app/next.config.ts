import type { NextConfig } from "next";
import CopyWebpackPlugin from 'copy-webpack-plugin';

const nativeExternalPackages = ['@imgly/background-removal-node', 'sharp'];

const nextConfig: NextConfig = {
  // Keep native modules external so their .node bindings aren't bundled
  serverExternalPackages: nativeExternalPackages,
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

    // Handle onnxruntime-web WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
      include: /node_modules\/onnxruntime-web/,
    });

    // Copy onnxruntime-web WASM files to public directory
    if (!isServer) {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: 'node_modules/onnxruntime-web/dist/*.wasm',
              to: '[name][ext]',
            },
            {
              from: 'node_modules/@imgly/background-removal/dist/*.wasm',
              to: '[name][ext]',
            },
          ],
        })
      );
    }



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

      };
    }

    // Keep native bindings external on the server to avoid webpack parsing .node files
    if (isServer) {
      if (Array.isArray(config.externals)) {
        config.externals.push(...nativeExternalPackages);
      } else if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = async (
          context: any,
          request: any,
          callback: (err?: unknown, result?: string) => void
        ) => {
          if (nativeExternalPackages.includes(request as string)) {
            return callback(null, `commonjs ${request}`);
          }
          if (originalExternals) {
            return originalExternals(context, request, callback);
          }
          callback();
        };
      }
    }

    // Handle problematic imports from @imgly/background-removal
    config.resolve.alias = {
      ...config.resolve.alias,
      // Alias problematic imports to empty modules
      'a': false,
    };

    // Ignore specific modules that cause issues
    config.plugins.push(
      new (require('webpack').IgnorePlugin)({
        resourceRegExp: /^a$/,
        contextRegExp: /.*/,
      })
    );

    return config;
  },

  // Add transpilePackages for problematic dependencies
  transpilePackages: ['@imgly/background-removal'],
  
  // Runtime configuration for onnxruntime-web
  publicRuntimeConfig: {
    onnxRuntimePath: '/onnxruntime-web.wasm',
  },
};

export default nextConfig;
