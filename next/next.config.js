/** @type {import('next').NextConfig} */
const webpack = require("webpack");

const nextConfig = {
  webpack: (config, { isServer }) => {
    config.plugins = config.plugins || [];
    
    // Ignore problematic modules that cause SSR issues
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/core$/,
        contextRegExp: /node_modules\/@magic-ext\/oauth\/dist\/es$/,
      })
    );

    // Prevent wallet libraries from being bundled on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@metamask/sdk': 'commonjs @metamask/sdk',
        '@walletconnect/ethereum-provider': 'commonjs @walletconnect/ethereum-provider',
        '@coinbase/wallet-sdk': 'commonjs @coinbase/wallet-sdk',
        '@farcaster/frame-wagmi-connector': 'commonjs @farcaster/frame-wagmi-connector',
      });
    }

    // Add fallbacks for Node.js modules that wallet libraries might need
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      url: require.resolve('url'),
      zlib: require.resolve('browserify-zlib'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      assert: require.resolve('assert'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
    };

    // Optimize bundle splitting for better mobile loading
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        maxInitialRequests: 25,
        minSize: 20000,
        cacheGroups: {
          // Separate wallet libraries into their own chunks
          wallets: {
            test: /[\\/]node_modules[\\/](@metamask|@walletconnect|@coinbase|@farcaster)[\\/]/,
            name: 'wallets',
            chunks: 'all',
            priority: 10,
          },
          // Separate wagmi and related libraries
          wagmi: {
            test: /[\\/]node_modules[\\/](wagmi|viem|@tanstack)[\\/]/,
            name: 'wagmi',
            chunks: 'all',
            priority: 9,
          },
        },
      },
    };

    return config;
  },
  // Add output configuration for standalone mode
  output: "standalone",
  // Specify the source directory
  distDir: ".next",
  // Image optimization
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.imgur.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "imperfectform.fun",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Experimental features
  experimental: {
    optimizeCss: true, // CSS optimization
    scrollRestoration: true, // Better scrolling experience
  },
  // Basic configuration
  reactStrictMode: true,
  // Enable compression
  compress: true,
  // Modern JavaScript features
  transpilePackages: [],

  // Redirects for Farcaster Mini App manifest
  async redirects() {
    return [
      {
        source: "/.well-known/farcaster.json",
        destination: "/api/farcaster-manifest",
        permanent: false,
      },
    ];
  },
  // Custom headers for .well-known directory
  async headers() {
    return [
      {
        source: "/.well-known/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/json",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
