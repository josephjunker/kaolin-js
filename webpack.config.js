var webpack = require('webpack');

module.exports = {
  entry: './index.js',
  devtool: 'source-map',
  externals: {
  },
  output: {
    libraryTarget: 'umd',
    path: './lib',
    filename: '[name].js'
  },
  module: {
    loaders: [{ test: /\.js$/, loader: 'babel', exclude: /node_modules/ }]
  },
  resolve: {
    extensions: ['', '.js']
  }
};

