const _setupView = function () {
    if(typeof this['_config'] !== 'undefined') {
        this['_config']['display.visualizations.custom.visualization_toolbox.hman.echartUniqueId'] = this._sharedFunctions.generateEchartUniqueId();
    }
};

module.exports = _setupView;