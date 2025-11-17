class PrivateVars {
  constructor() {
    this.initialized = false; // Global scoped variable keeping track of the SplunkVisualizationBase.initialize call
    this.visualizationType = '';
    this.visualizationHeight = null;
    this._renderedEchartsArray = []; // Global scoped variable with multiple echarts instances
  }
}

module.exports = PrivateVars;