const mqttLib = require('mqtt/dist/mqtt.esm');
const mqtt = mqttLib.default;

const _initializeMQTT = function (echartProps) {
  let clientId, tmpMqttOptions, tmpMqttTopic, tmpMqttClient;
  let useMQTT = false;
  let configMqttUser = echartProps.mqttUser;
  let configMqttPassword = echartProps.mqttPassword;
  let configMqttTopic = echartProps.mqttTopic;
  let configMqttPanelConnectionTimeout = echartProps.configMqttPanelConnectionTimeout || 5000;
  let configMqttPanelHostname = echartProps.configMqttPanelHostname;
  let configMqttPanelProtocol = echartProps.configMqttPanelProtocol || 'wss';
  let configMqttPanelPath = echartProps.configMqttPanelPath || '/mqtt';
  let configMqttPanelPort = echartProps.configMqttPanelPort || 8443;
  try {
    if (configMqttUser != null && configMqttPassword != null && configMqttTopic != null) {
      useMQTT = true;
    }
  } catch (e) {
    useMQTT = false;
  }

  if (useMQTT) {
    clientId = Math.random().toString(10) + Date.now();
    clientId.substring(0, 23); //returns part of this clientId string from the 0 index up to and excluding the 23 index because clientId must not exceed 23 chars
    tmpMqttOptions = {
      clientId: clientId,
      connectTimeout: configMqttPanelConnectionTimeout,
      hostname: configMqttPanelHostname,
      protocol: configMqttPanelProtocol,
      path: configMqttPanelPath,
      port: configMqttPanelPort,
      username: configMqttUser,
      password: configMqttPassword
    }
    tmpMqttTopic = configMqttUser + "/" + clientId + configMqttTopic;
    tmpMqttClient = mqtt.connect(tmpMqttOptions);
    tmpMqttClient.on('connect', () => {
      console.log(`mqtt client id: ${clientId} connected successfully!`);
    })
    tmpMqttClient.on('error', () => {
      console.log(`mqtt client id: ${clientId} encountered an error!`);
    })
    return {
      mqttClient: tmpMqttClient,
      mqttTopic: tmpMqttTopic,
      mqttOptions: tmpMqttOptions
    }
  }
}

module.exports = _initializeMQTT