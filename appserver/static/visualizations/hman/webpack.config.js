var webpack = require('webpack');
var path = require('path');
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: `${__dirname}/src/visualization_source.js`,
    resolve: {
        modules: [`${__dirname}/node_modules`]
    },
    mode: 'development',
    output: {
        path: `${__dirname}`,
        filename: 'visualization.js',
        libraryTarget: 'amd',
        libraryExport: 'default'
    },
    //Temporary flag until we test properly the changes
    optimization: {
        minimize: false,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
            }),
        ],
    },
    //externalsType: "node-commonjs",
    externals: [
        'api/SplunkVisualizationBase',
        'api/SplunkVisualizationUtils'
    ]
};

