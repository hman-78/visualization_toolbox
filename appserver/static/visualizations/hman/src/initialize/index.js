const PrivateVars = require('../privateVars');
const SplunkVisualizationBase = require('api/SplunkVisualizationBase');

const _initialize = function () {
  const scopedVariables = new PrivateVars();
  if (!scopedVariables.initialized) {
    SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
    this.$el = $(this.el);
    var splunk = this;
    this.createModal(splunk);
    scopedVariables.initialized = true;
  }
}

module.exports = _initialize