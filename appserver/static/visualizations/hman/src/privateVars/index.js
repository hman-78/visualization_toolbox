class PrivateVars {
  constructor() {
    this.initialized = false;
    this.mqttTopic = null;
    this.mqttOptions = null;
    this.mqttClient = null;
    this._data = null;
    this._annotationSeriesDataIndex = null;
    this._annotationSeriesIndex = null;
    this._myChart = null;
    this._option = null;
  }
}

module.exports = PrivateVars;