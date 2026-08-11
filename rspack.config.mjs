import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  mode: process.env.NODE_ENV === "production" ? "production" : "development",

  entry: "./src/main.ts",

  devtool: "source-map",

  resolve: {
    extensions: [".ts", ".js"],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: { syntax: "typescript" },
            target: "es2020",
          },
        },
        type: "javascript/auto",
      },
    ],
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].[contenthash].js",
    clean: true,
  },

  plugins: [
    new rspack.HtmlRspackPlugin({
      template: "./index.html",
    }),
  ],

  devServer: {
    port: 8080,
    open: false,
    hot: true,
  },
});