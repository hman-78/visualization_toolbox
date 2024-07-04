const echarts = require('echarts');
var _ = require('lodash');

// Implement updateView to render a visualization.
// This function is called whenever search results are updated or the visualization format changes. It handles visualization rendering
// 'data' will be the data object returned from formatData or from the search containing search result data
// 'config' will be the configuration property object containing visualization format information.

const _updateView = function (data, config) {
  let tmpChart = null;
  const uniqueAttribute = this.el.getAttribute('data-cid');
  const tmpUniqueDomId = this.el.id + '_' + uniqueAttribute;
  this.el.id = tmpUniqueDomId;
  this.el.parentNode.id = tmpUniqueDomId;
  this.el.parentNode.parentNode.parentNode.parentNode.id = tmpUniqueDomId;
  this.scopedVariables['_data'] = data;
  if (!data || !data.rows || data.rows.length < 1) {
    return;
  }
  this._initializeMQTT(data, config);
  let configDataType = config[this.getPropertyNamespaceInfo().propertyNamespace + "dataType"];
  tmpChart = _.find(this.scopedVariables['_echartsInstancesArray'], {domWrapperId: tmpUniqueDomId});
  if(typeof tmpChart !== 'undefined') {
    tmpChart.instanceAttachedToDomElement.dispose() //Solve the error reported by echarts dom already loaded
  } else {
    const tmpEchartsInstance = echarts.init(this.el);
    this.scopedVariables['_echartsInstancesArray'].push({
      id: tmpEchartsInstance.id,
      domWrapperId: tmpUniqueDomId,
      instanceAttachedToDomElement: tmpEchartsInstance
    })
  }
  tmpChart = _.find(this.scopedVariables['_echartsInstancesArray'], {domWrapperId: tmpUniqueDomId});
  console.log('tmpEchartsInstance', tmpChart.instanceAttachedToDomElement)
  let option = {};
  if (configDataType == "Custom") {
    option = this._buildCustomOption(data, config);
  } else if (configDataType == "Boxplot") {
    option = this._buildBoxplotOption(data, config);
  } else if (configDataType == "SimpleBoxplot") {
    option = this._buildSimpleBoxplotOption(data, config);
  }
  // tokens might not yet be replaced in the option. In this case we
  // don't want the echart to be shown yet, as it would result in an error.
  // Once the token is replaced this method is called again, option is parsed
  // and echart is shown to the user.
  if (option == null) {
    return;
  }
  let xAxisDataHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataHook"];
  let yAxisDataHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "yAxisDataHook"];
  let jsHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "jsHook"];
  let clickHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "clickHook"];
  let annotationSeriesName = config[this.getPropertyNamespaceInfo().propertyNamespace + "annotationSeriesName"];

  if (xAxisDataHook != null) {
    option.xAxis.data = this.selfModifiyingOptionWithReturn(data, config, option, xAxisDataHook);
    console.log("Using option 'xAxisDataHook' is deprecated. Please use option 'jsHook' instead.")
  }
  if (yAxisDataHook != null) {
    option.yAxis.data = this.selfModifiyingOptionWithReturn(data, config, option, yAxisDataHook);
    console.log("Using option 'yAxisDataHook' is deprecated. Please use option 'jsHook' instead.")
  }
  if (jsHook != null) {
    this.selfModifiyingOption(data, config, option, jsHook);
  }
  if (clickHook != null) {
    tmpChart.instanceAttachedToDomElement.on('click', onChartClick);
  }
  if (annotationSeriesName != null) {
    this._handleAnnotation(data, config, option, annotationSeriesName, tmpChart);
  }

  console.log(option);
  tmpChart.instanceAttachedToDomElement.setOption(option);
  tmpChart['_myChart'] = tmpChart.instanceAttachedToDomElement;
  tmpChart['_option'] = option;
  console.log("this.scopedVariables['_echartsInstancesArray']", this.scopedVariables['_echartsInstancesArray']);
  let splunk = this;

  // Function called by click on chart if option clickHook is enabled
  // Used to call the Javascript Code provided by the option clickHook to
  // set tokens for drill down
  function onChartClick(params) {
    this.evalHook = eval("(function a(params, data, config, option, event, splunk) {" + clickHook + "})");
    this.evalHook(params, data, config, option, params.event, splunk);
  }
}

module.exports = _updateView;