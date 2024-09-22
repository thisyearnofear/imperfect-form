const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const webpack = require("webpack");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env"],
          },
        },
      },
      {
        test: /\.json$/, // Add this rule to handle JSON files
        loader: "json-loader",
        type: "javascript/auto",
      },
    ],
  },
  resolve: {
    extensions: [".js"],
    alias: {
      "@coinbase/wallet-sdk": path.resolve(
        __dirname,
        "node_modules/@coinbase/wallet-sdk"
      ), // Add alias for wallet-sdk
    },
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      assert: require.resolve("assert/"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      url: require.resolve("url/"),
      buffer: require.resolve("buffer/"), // Added buffer fallback
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html", // Path to your template HTML file
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "style.css", to: "style.css" },
        { from: "src/leaderboard.js", to: "leaderboard.js" },
        { from: "src/webcam.js", to: "webcam.js" },
        { from: "assets", to: "assets" }, // Copy assets to the dist folder
      ],
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    compress: true,
    port: 9000,
    historyApiFallback: true, // Serve index.html for all routes
    allowedHosts: "all", // Allow all hosts
  },
};
