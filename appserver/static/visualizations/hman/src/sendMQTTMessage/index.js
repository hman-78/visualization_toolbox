const _sendMQTTMessage = function (dedicatedMqttClient, dedicatedMqttTopic, message) {
  console.log(`_sendMQTTMessage: ${message}`);
  if (!dedicatedMqttClient || !dedicatedMqttTopic) {
    console.error('_sendMQTTMessage: MQTT is not configured for this visualization, message not sent');
    this._setSplunkMessages("error", "Changes could not be saved: MQTT is not configured for this visualization.");
    return;
  }
  dedicatedMqttClient.publish(dedicatedMqttTopic, message, { qos: 0, retain: false }, (mqttPublishError) => {
    if (mqttPublishError) {
      console.error(`MqttClient id: ${dedicatedMqttClient.options.clientId} publishing error: ${mqttPublishError}`);
      this._setSplunkMessages("error", "Changes could not be saved: MQTT publishing failed.");
    } else {
      console.log(`MqttClient id: ${dedicatedMqttClient.options.clientId} published message: ${message}`);
    }
  });
}

module.exports = _sendMQTTMessage