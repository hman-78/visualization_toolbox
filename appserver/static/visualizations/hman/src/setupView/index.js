const _setupView = function () {
    if(typeof this['_config'] !== 'undefined') {
        this['_config']['display.visualizations.custom.visualization_toolbox.hman.echartUniqueId'] += Date.now();
    }
};

module.exports = _setupView;