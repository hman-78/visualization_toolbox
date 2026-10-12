const echarts = require('echarts');
const SplunkVisualizationUtils = require('api/SplunkVisualizationUtils');

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

  // Get the default tokens model, extract splunk relative times and save them to scopedVariables
  //eslint-disable-next-line
  var defaultTokens = splunkjs.mvc.Components.get("default");
  if(defaultTokens) {
    const splunkRelativeTimeEarliest = defaultTokens.get("time_range.earliest");
    const splunkRelativeTimeLatest = defaultTokens.get("time_range.latest");
    const earliestTimestamp =  this._sharedFunctions.parseSplunkRelativeTime(splunkRelativeTimeEarliest);
    const latestTimestamp = this._sharedFunctions.parseSplunkRelativeTime(splunkRelativeTimeLatest);
    this.scopedVariables['timeRange'] = {
      earliest: earliestTimestamp,
      latest: latestTimestamp
    };
  }

  let tmpChart = {}
  let currentChart = this.scopedVariables['_renderedEchartsArray'].find(o => o.id === echartProps.echartUniqueId);
  if(typeof currentChart !== 'undefined') {
    currentChart.instanceByDom.dispose()
    if (currentChart.mqttClient) { currentChart.mqttClient.end(true); }
    this.scopedVariables['_renderedEchartsArray'] = this.scopedVariables['_renderedEchartsArray'].filter(o => o.id !== echartProps.echartUniqueId);
  }
  const dedicatedMqttClient = this._initializeMQTT(echartProps);
  tmpChart['id'] = echartProps.echartUniqueId;
  tmpChart['_data'] = data;

  const currentTheme = SplunkVisualizationUtils.getCurrentTheme();
  const echartsTheme = currentTheme;
  if (echartProps.dataType.toLowerCase() === 'timeline') {
    tmpChart['_applyBgColor'] = true;
  }
  // For timeline, echarts.init is deferred until after buildTimelineOption computes the correct height
  if (echartProps.dataType.toLowerCase() !== 'timeline') {
    tmpChart['instanceByDom'] = echarts.init(this.el, echartsTheme);
  }
  if(typeof dedicatedMqttClient !== 'undefined') {
    tmpChart['mqttClient'] = dedicatedMqttClient.mqttClient;
    tmpChart['mqttTopic'] = dedicatedMqttClient.mqttTopic;
    tmpChart['mqttOptions'] = dedicatedMqttClient.mqttOptions;
  } else {
    tmpChart['mqttClient'] = '';
    tmpChart['mqttTopic'] = '';
    tmpChart['mqttOptions'] = '';
  }
  let option = {};
  if (echartProps.dataType.toLowerCase() == "custom") {
    option = this._buildCustomOption(data, config);
  } else if (echartProps.dataType.toLowerCase() == "boxplot") {
    option = this._buildBoxplotOption(data, config);
  } else if (echartProps.dataType.toLowerCase() == "simpleboxplot") {
    option = this._buildSimpleBoxplotOption(data, config);
  } else if (echartProps.dataType.toLowerCase() == "timeline") {
    // Init with height:1 as placeholder — we will resize to the correct height after build
    tmpChart['instanceByDom'] = echarts.init(this.el, echartsTheme, { height: 1 });
    option = this._buildTimelineOption(data, config, tmpChart['instanceByDom'], tmpChart);
    if (tmpChart['visualizationHeight']) {
      const contentHeight = tmpChart['visualizationHeight'];
      this.el.style.height = `${contentHeight}px`;
      tmpChart['instanceByDom'].resize({ height: contentHeight });
    }
  } else if (echartProps.dataType.toLowerCase() == "hourlytimeline") {
    option = this._buildHourlyTimelineOption(data, config, tmpChart['instanceByDom']);
  }
  // tokens might not yet be replaced in the option. In this case we
  // don't want the echart to be shown yet, as it would result in an error.
  // Once the token is replaced this method is called again, option is parsed
  // and echart is shown to the user.
  if (option == null) {
    tmpChart['instanceByDom'].dispose();
    return;
  }
  tmpChart['visualizationType'] = echartProps.dataType.toLowerCase();
  this.scopedVariables['_renderedEchartsArray'].push(tmpChart);

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

  // Hide legend if not specified; otherwise fix default eCharts v6 position
  if (typeof option.legend === 'undefined') {
    option.legend = { show: false };
  } else if (typeof option.legend.top === 'undefined' && typeof option.legend.bottom === 'undefined') {
    option.legend.top = 0;
  }

  tmpChart['instanceByDom'].setOption(option);
  tmpChart['_option'] = option;

  // A data change (e.g. dashboard filters feeding more rows) rebuilds the chart here but does not
  // trigger reflow, so re-run it to re-apply the timeline canvas height and the panel scroll state.
  if (tmpChart['visualizationType'] === 'timeline') {
    try { this.reflow(); } catch (e) { console.log('reflow after timeline render failed', e); }
  }

  if (tmpChart['_applyBgColor']) {
    const resizablePanelForBg = this.el.closest('.shared-reportvisualizer.ui-resizable');
    if (resizablePanelForBg) {
      if (currentTheme === 'dark') {
        const canvasEl = this.el.querySelector('canvas');
        if (canvasEl) {
          const ctx = canvasEl.getContext('2d');
          const pixel = ctx.getImageData(0, 0, 1, 1).data;
          resizablePanelForBg.style.backgroundColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        }
      } else {
        resizablePanelForBg.style.backgroundColor = '';
      }
    }
  }
  
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
