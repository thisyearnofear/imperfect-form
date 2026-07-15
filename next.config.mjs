/** @type {import('next').NextConfig} */
const nextConfig = {
  // Basic configuration
  reactStrictMode: true,
  compress: true,

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
      {
        protocol: "https",
        hostname: "imagedelivery.net",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // Experimental features
  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
  },

  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    resolveAlias: {
      // pose-detection statically imports the unused MediaPipe runtime; see stub
      "@mediapipe/pose": "./src/stubs/mediapipe-pose.js",
    },
  },

  // Webpack configuration to fix runtime errors
  webpack: (config, { isServer }) => {
    // Keep webpack builds consistent with the Turbopack alias above
    config.resolve.alias = {
      ...config.resolve.alias,
      "@mediapipe/pose": new URL("./src/stubs/mediapipe-pose.js", import.meta.url)
        .pathname,
    };

    // Fix for "Cannot read properties of undefined (reading 'call')" error
    // This ensures webpack runtime is properly handled
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Ensure webpack chunks are properly named and don't conflict
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          framework: {
            chunks: 'all',
            name: 'framework',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 30,
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },

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

export default nextConfig;
