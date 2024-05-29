const mqtt = require('mqtt');

const _initializeMQTT = function (data, config) {
  let useMQTT = false;
  let configMqttUser = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttUser"];
  let configMqttPassword = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttPassword"];
  let configMqttTopic = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttTopic"];
  let configMqttPanelConnectionTimeout = config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelConnectionTimeout"] || 5000;
  let configMqttPanelHostname = config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelHostname"];
  let configMqttPanelProtocol = config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelProtocol"] || 'wss';
  let configMqttPanelPath = config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelPath"] || '/mqtt';
  let configMqttPanelPort = config[this.getPropertyNamespaceInfo().propertyNamespace + "configMqttPanelPort"] || 8443;
  try {
    if (configMqttUser != null && configMqttPassword != null && configMqttTopic != null) {
      useMQTT = true;
    }
  } catch (e) {
    useMQTT = false;
  }

  if (useMQTT) {
    let clientId = Math.random().toString(10) + Date.now();
    clientId.substring(0, 23); //returns part of this clientId string from the 0 index up to and excluding the 23 index because clientId must not exceed 23 chars
    let options = {
      clientId: clientId,
      connectTimeout: configMqttPanelConnectionTimeout,
      hostname: configMqttPanelHostname,
      protocol: configMqttPanelProtocol,
      path: configMqttPanelPath,
      port: configMqttPanelPort,
      username: configMqttUser,
      password: configMqttPassword
    }
    this.scopedVariables['mqttClient'] = mqtt.connect(options);
    this.scopedVariables['mqttClient'].on('connect', () => {
      console.log('Connected')
    })
    this.scopedVariables['mqttTopic'] = configMqttUser + "/" + clientId + configMqttTopic;
    this.scopedVariables['mqttOptions'] = options;
  }
}

module.exports = _initializeMQTT