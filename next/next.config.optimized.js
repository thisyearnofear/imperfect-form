/** @type {import('next').NextConfig} */
const webpack = require("webpack");

const nextConfig = {
  webpack: (config, { dev, isServer }) => {
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/core$/,
        contextRegExp: /node_modules\/@magic-ext\/oauth\/dist\/es$/,
      })
    );

    // Development optimizations
    if (dev) {
      // Faster builds in development
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            // Separate heavy ML libraries
            tensorflow: {
              test: /[\\/]node_modules[\\/](@tensorflow|@mediapipe)[\\/]/,
              name: "tensorflow",
              chunks: "all",
              priority: 30,
            },
            // Separate wallet libraries
            wallets: {
              test: /[\\/]node_modules[\\/](@thirdweb-dev|wagmi|viem|@coinbase|connectkit|ethers)[\\/]/,
              name: "wallets",
              chunks: "all",
              priority: 20,
            },
            // Separate React and core libraries
            vendor: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: "vendor",
              chunks: "all",
              priority: 10,
            },
          },
        },
      };

      // Faster rebuilds
      config.cache = {
        type: "filesystem",
        buildDependencies: {
          config: [__filename],
        },
      };

      // Reduce bundle analysis overhead in dev
      config.optimization.removeAvailableModules = false;
      config.optimization.removeEmptyChunks = false;
    }

    // Client-side optimizations
    if (!isServer) {
      // Exclude heavy server-side modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    return config;
  },

  // Output configuration
  output: "standalone",
  distDir: ".next",

  // Image optimization
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    formats: ["image/webp", "image/avif"],
  },

  // Basic configuration
  reactStrictMode: true,
  compress: true,
  transpilePackages: [],

  // Development-specific optimizations
  experimental: {
    optimizeCss: process.env.NODE_ENV === "production",
    scrollRestoration: true,
  },

  // Development server optimizations
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // 1 minute
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;
