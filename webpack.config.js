const path = require("path");

module.exports = {
  entry: "./demo.js",
  output: {
    path: path.resolve(__dirname, "./"),
    filename: "bundle.js",
  },
  devServer: {
    contentBase: "./",
    publicPath: '',
    openPage: 'demo.html',
  },
};