// Private method for returning all the echart properties from a configuration object

const _getEchartProps = function (config) {
  return {
    echartUniqueId: config['display.visualizations.custom.visualization_toolbox.hman.echartUniqueId'],
    dataType: config[this.getPropertyNamespaceInfo().propertyNamespace + "dataType"],
    option: config[this.getPropertyNamespaceInfo().propertyNamespace + "option"],
    xAxisDataIndexBinding: config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataIndexBinding"],
    seriesDataIndexBinding: config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesDataIndexBinding"],
    jsHook: config[this.getPropertyNamespaceInfo().propertyNamespace + "jsHook"],
    seriesColorDataIndexBinding: config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesColorDataIndexBinding"],
    clickHook: config[this.getPropertyNamespaceInfo().propertyNamespace + "clickHook"],
    annotationSeriesName: config[this.getPropertyNamespaceInfo().propertyNamespace + "annotationSeriesName"],
    errorDataIndexBinding: config[this.getPropertyNamespaceInfo().propertyNamespace + "errorDataIndexBinding"],
    configMqttPanelConnectionTimeout: config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelConnectionTimeout"],
    configMqttPanelHostname: config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelHostname"],
    configMqttPanelProtocol: config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelProtocol"],
    configMqttPanelPath: config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelPath"],
    configMqttPanelPort: config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelPort"],
    mqttUser: config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttUser"],
    mqttPassword: config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttPassword"],
    mqttTopic: config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttTopic"],
    xAxisDataHook: config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataHook"],
    yAxisDataHook: config[this.getPropertyNamespaceInfo().propertyNamespace + "yAxisDataHook"],
    annotationSeriesDataIndexBinding: config[this.getPropertyNamespaceInfo().propertyNamespace + "annotationSeriesDataIndexBinding"],
    opco: config[this.getPropertyNamespaceInfo().propertyNamespace + "opco"]
  }
}

module.exports = _getEchartProps;
