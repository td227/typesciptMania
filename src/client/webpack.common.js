const path = require('path');

module.exports = {
	entry: './src/client/jsMania.ts',
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js', '.png']
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, '../../dist/client')
	}
};
