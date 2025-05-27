/** @type {import('next').NextConfig} */
const webpack = require("webpack");

const nextConfig = {
  webpack: (config) => {
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/core$/,
        contextRegExp: /node_modules\/@magic-ext\/oauth\/dist\/es$/,
      })
    );

    // Optimize bundle splitting for better mobile loading
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: "all",
        maxInitialRequests: 25,
        minSize: 20000,
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
