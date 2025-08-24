import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require("webpack");

const nextConfig: NextConfig = {
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
};

export default nextConfig;
