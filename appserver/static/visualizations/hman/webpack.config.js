var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: `${__dirname}/src/visualization_source`,
    resolve: {
        modules: [`${__dirname}/node_modules`]
    },
    mode: 'production',
    output: {
        path: `${__dirname}`,
        filename: 'visualization.js',
        libraryTarget: 'amd'
    },
    //Temporary flag until we test properly the changes
    optimization: {
        minimize: false
    },
    externals: [
        'api/SplunkVisualizationBase',
        'api/SplunkVisualizationUtils'
    ]
};

