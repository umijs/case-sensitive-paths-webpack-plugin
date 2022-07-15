const Plugin = require('../dist');

module.exports = {
  mode: 'production',
  plugins: [new Plugin()],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
}
