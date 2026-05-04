const HtmlWebPackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require('path');

// Force all @pixi packages to resolve to the single top-level copy.
// Without this, nested node_modules produce multiple Renderer class instances,
// causing GraphicsRenderer to register on the wrong one → currentRenderer undefined.
const pixiAlias = [
  'core', 'display', 'math', 'utils', 'settings', 'runner', 'ticker',
  'constants', 'extensions', 'graphics', 'interaction', 'app',
  'sprite', 'text', 'loaders', 'mesh', 'particles',
  'filter-alpha', 'filter-blur', 'filter-color-matrix',
  'filter-displacement', 'filter-fxaa', 'filter-noise',
  'extract', 'prepare', 'accessibility', 'polyfill',
  'sprite-animated', 'sprite-tiling', 'spritesheet',
  'text-bitmap', 'mesh-extras',
  'mixin-cache-as-bitmap', 'mixin-get-child-by-name', 'mixin-get-global-position',
].reduce((acc, pkg) => {
  acc[`@pixi/${pkg}`] = path.resolve(__dirname, `node_modules/@pixi/${pkg}`);
  return acc;
}, {});

module.exports = {
  resolve: {
    alias: pixiAlias,
  },
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: '[name].js',
    assetModuleFilename: '[name][ext]'
  },
  optimization: {
    splitChunks: {
      chunks: 'all'
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.html$/,
        use: [
          {
            loader: "html-loader"
          }
        ]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.json$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: "./src/index.html",
      filename: "./index.html"
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ]
};
