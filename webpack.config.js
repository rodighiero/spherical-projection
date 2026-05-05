const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const path = require('path')

module.exports = {
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: '[name].js',
    assetModuleFilename: '[name][ext]',
    clean: true,
  },
  optimization: {
    // Single bundle output — no numbered chunk files in docs/.
    splitChunks: false,
    runtimeChunk: false,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.html$/,
        use: 'html-loader',
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.json$/,
        type: 'asset/resource',
        generator: { filename: '[name][ext]' },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: './index.html',
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    // Pixi v8 ships dynamic imports for environment detection that webpack
    // would split into extra chunks. Force everything into main.js.
    new webpack.optimize.LimitChunkCountPlugin({ maxChunks: 1 }),
  ],
}
