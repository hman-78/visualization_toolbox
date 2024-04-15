const _initializeMQTT = function (data, config) {
  const mqtt = __webpack_require__(11)
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
    mqttClient = mqtt.connect(options);
    mqttClient.on('connect', () => {
      console.log('Connected')

    })
  }

  // TODO cleanup mqtt
  mqttTopic = configMqttUser + "/" + clientId + configMqttTopic;
  mqttOptions = options;

}

module.exports = _initializeMQTT