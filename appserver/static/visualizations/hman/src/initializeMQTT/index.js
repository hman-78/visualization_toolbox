const _initializeMQTT = function (data, config) {
  const mqtt = require('mqtt');
  var useMQTT = false;
  try {
    var configMqttUser = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttUser"];
    var configMqttPassword = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttPassword"];
    var configMqttTopic = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttTopic"];
    //var configMqttPath = config[this.getPropertyNamespaceInfo().propertyNamespace +"mqttPath"];
    if (configMqttUser != null && configMqttPassword != null && configMqttTopic != null) {
      useMQTT = true;
    }
  } catch (e) {
    useMQTT = false;
  }

  if (useMQTT) {
    var clientId = Math.random().toString(23);
    var options = {
      clientId: clientId,
      connectTimeout: 5000,
      hostname: 'mqtt01.heraeus.com',
      protocol: 'wss',
      path: '/mqtt',
      port: 8443,
      username: configMqttUser,
      password: configMqttPassword
    }
    this.scopedVariables['mqttClient'] = mqtt.connect(options);
    this.scopedVariables['mqttClient'].on('connect', () => {
      console.log('Connected')
    })
  }

  // TODO cleanup mqtt
  this.scopedVariables['mqttTopic'] = configMqttUser + "/" + clientId + configMqttTopic;
  this.scopedVariables['mqttOptions'] = options;

}

module.exports = _initializeMQTT