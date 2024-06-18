const SplunkVisualizationBase = require('api/SplunkVisualizationBase');

const _initialize = function () {
  if (!this.scopedVariables['initialized']) {
    SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
    this.$el = $(this.el);
    var splunk = this;
    this.createModal(splunk);
    this.scopedVariables['initialized'] = true;
  }
}

module.exports = _initialize