var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: `${__dirname}/src/visualization_source`,
    resolve: {
        modules: [`${__dirname}/node_modules`]
    },
    mode: 'production',
    output: {
        filename: 'visualization.js',
        libraryTarget: 'amd'
    },
    externals: [
        'api/SplunkVisualizationBase',
        'api/SplunkVisualizationUtils'
    ]
};

