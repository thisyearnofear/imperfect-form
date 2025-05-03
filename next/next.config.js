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
    return config;
  },
  // Add output configuration for standalone mode
  output: 'standalone',
};

module.exports = nextConfig;
