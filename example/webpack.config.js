const Plugin = require('../dist').default;

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
