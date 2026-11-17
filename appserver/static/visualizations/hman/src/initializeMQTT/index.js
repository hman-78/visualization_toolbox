const mqttLib = require('mqtt/dist/mqtt.esm');
const mqtt = mqttLib.default;
const MQTT_MAX_FAILED_ATTEMPTS = 5;

const _initializeMQTT = function (echartProps) {
  let clientId, tmpMqttOptions, tmpMqttTopic, tmpMqttClient;
  let configMqttUser = echartProps.mqttUser;
  let configMqttPassword = echartProps.mqttPassword;
  let configMqttTopic = echartProps.mqttTopic;
  let configMqttPanelConnectionTimeout = parseInt(echartProps.configMqttPanelConnectionTimeout) || 5000;
  let configMqttPanelHostname = echartProps.configMqttPanelHostname;
  let configMqttPanelProtocol = echartProps.configMqttPanelProtocol || 'wss';
  let configMqttPanelPath = echartProps.configMqttPanelPath || '/mqtt';
  let configMqttPanelPort = parseInt(echartProps.configMqttPanelPort) || 8443;
  // hostname is optional: in the browser mqtt.js falls back to the dashboard's host
  const useMQTT = [configMqttUser, configMqttPassword, configMqttTopic].every(value => value != null && value !== '');

  if (useMQTT) {
    clientId = Math.random().toString(10) + Date.now();
    clientId = clientId.substring(0, 23); //returns part of this clientId string from the 0 index up to and excluding the 23 index because clientId must not exceed 23 chars
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
    let failedAttempts = 0;
    tmpMqttClient.on('connect', () => {
      failedAttempts = 0;
      console.log(`mqtt client id: ${clientId} connected successfully!`);
    })
    // mqtt.js reconnects forever by default; give up after MQTT_MAX_FAILED_ATTEMPTS consecutive failures
    tmpMqttClient.on('close', () => {
      if (++failedAttempts >= MQTT_MAX_FAILED_ATTEMPTS && !tmpMqttClient.disconnecting) {
        console.log(`mqtt client id: ${clientId} giving up after ${failedAttempts} failed connection attempts`);
        tmpMqttClient.end(true);
      }
    })
    tmpMqttClient.on('error', (err) => {
      console.log(`mqtt client id: ${clientId} encountered an error: ${err.message}`);
    })
    return {
      mqttClient: tmpMqttClient,
      mqttTopic: tmpMqttTopic
    }
  }
}

module.exports = _initializeMQTT