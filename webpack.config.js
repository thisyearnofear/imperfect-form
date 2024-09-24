const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
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
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.json$/,
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
      ),
    },
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      assert: require.resolve("assert/"),
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      os: require.resolve("os-browserify/browser"),
      url: require.resolve("url/"),
      buffer: require.resolve("buffer/"),
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "src/style.css", to: "style.css" },
        { from: "src/leaderboard.js", to: "leaderboard.js" },
        { from: "src/webcam.js", to: "webcam.js" },
        { from: "assets", to: "assets" },
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
      watch: true, // Ensure changes are watched
    },
    compress: true,
    port: 9000,
    allowedHosts: "all",
    historyApiFallback: {
      // Serves index.html only for specific routes, not for all 404s
      rewrites: [{ from: /^\/$/, to: "/index.html" }],
    },
  },
};
