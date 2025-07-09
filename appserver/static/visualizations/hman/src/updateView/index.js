const echarts = require('echarts');
const SplunkVisualizationUtils = require('api/SplunkVisualizationUtils');
//const cloneDeep = require('lodash.clonedeep');

// Implement updateView to render a visualization.
// This function is called whenever search results are updated or the visualization format changes. It handles visualization rendering
// 'data' will be the data object returned from formatData or from the search containing search result data
// 'config' will be the configuration property object containing visualization format information.

const _updateView = function (data, config) {
  // If there is no data, do nothing
  if (!data || !data.rows || data.rows.length < 1) { return; }

  // Read echart properties
  const echartProps = this._getEchartProps(config);

  if(typeof echartProps.echartUniqueId === 'undefined' || echartProps.echartUniqueId === '') {
    throw `Wrong configuration - echartUniqueId property not found! Please provide a unique echart id.`;
  }

  let tmpChart = {}
  let currentChart = this.scopedVariables['_renderedEchartsArray'].find(o => o.id === echartProps.echartUniqueId);
  if(typeof currentChart !== 'undefined') {
    currentChart.instanceByDom.dispose()
    this.scopedVariables['_renderedEchartsArray'] = this.scopedVariables['_renderedEchartsArray'].filter(o => o.id !== echartProps.echartUniqueId);
  }
  const dedicatedMqttClient = this._initializeMQTT(echartProps);
  tmpChart['id'] = echartProps.echartUniqueId;
  tmpChart['_data'] = data;

  const currentTheme = SplunkVisualizationUtils.getCurrentTheme();
  tmpChart['instanceByDom'] = echarts.init(this.el, currentTheme)
  if(typeof dedicatedMqttClient !== 'undefined') {
    tmpChart['mqttClient'] = dedicatedMqttClient.mqttClient;
    tmpChart['mqttTopic'] = dedicatedMqttClient.mqttTopic;
    tmpChart['mqttOptions'] = dedicatedMqttClient.mqttOptions;
  } else {
    tmpChart['mqttClient'] = '';
    tmpChart['mqttTopic'] = '';
    tmpChart['mqttOptions'] = '';
  }
  this.scopedVariables['_renderedEchartsArray'].push(tmpChart);

  let option = {};
  if (echartProps.dataType == "Custom") {
    option = this._buildCustomOption(data, config);
  } else if (echartProps.dataType == "Boxplot") {
    option = this._buildBoxplotOption(data, config);
  } else if (echartProps.dataType == "SimpleBoxplot") {
    option = this._buildSimpleBoxplotOption(data, config);
  } else if (echartProps.dataType == "Timeseries") {
    option = this._buildTimeseriesOption(data, config, tmpChart['instanceByDom']);
  }
  // tokens might not yet be replaced in the option. In this case we
  // don't want the echart to be shown yet, as it would result in an error.
  // Once the token is replaced this method is called again, option is parsed
  // and echart is shown to the user.
  if (option == null) {
    return;
  }

  if (echartProps.xAxisDataHook != null) {
    option.xAxis.data = this.selfModifiyingOptionWithReturn(data, config, option, echartProps.xAxisDataHook);
    console.log("Using option 'xAxisDataHook' is deprecated. Please use option 'jsHook' instead.")
  }
  if (echartProps.yAxisDataHook != null) {
    option.yAxis.data = this.selfModifiyingOptionWithReturn(data, config, option, echartProps.yAxisDataHook);
    console.log("Using option 'yAxisDataHook' is deprecated. Please use option 'jsHook' instead.")
  }
  if (echartProps.jsHook != null) {
    this.selfModifiyingOption(data, config, option, echartProps.jsHook);
  }
  if (echartProps.clickHook != null) {
    tmpChart['instanceByDom'].on('click', onChartClick);
  }
  if (echartProps.annotationSeriesName != null) {
    this._handleAnnotation(data, echartProps, option, tmpChart, config);
  }
  if(typeof option.textStyle === 'undefined') {
    option.textStyle = {
      fontFamily: "Splunk Platform Sans"
    }
  }
  tmpChart['instanceByDom'].setOption(option);
  tmpChart['_option'] = option;
  
  var splunk = this;

  // Function called by click on chart if option clickHook is enabled
  // Used to call the Javascript Code provided by the option clickHook to
  // set tokens for drill down
  // Call the set tokens and generate them for all the echarts vis + aux
  function onChartClick(params) {
    this.evalHook = eval("(function a(params, data, config, option, event, splunk) {" + echartProps.clickHook + "})");
    this.evalHook(params, data, config, option, params.event, splunk);
  }
  console.log("this.scopedVariables", this.scopedVariables);
  console.log('Applied option on echart instance ', option);
}

module.exports = _updateView;