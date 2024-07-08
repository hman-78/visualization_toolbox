class PrivateVars {
  constructor() {
    this.initialized = false; // Global scoped variable
    this._annotationSeriesDataIndex = null;
    this._annotationSeriesIndex = null;
    this._renderedEchartsArray = []; // Global scoped variable with nested echarts instances
  }
}

module.exports = PrivateVars;