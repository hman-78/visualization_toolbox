const _sendMQTTMessage = function (dedicatedMqttClient, dedicatedMqttTopic, message) {
  console.log(`_sendMQTTMessage: ${message}`);
  dedicatedMqttClient.publish(dedicatedMqttTopic, message, { qos: 0, retain: false }, (mqttPublishError) => {
    if (mqttPublishError) {
      console.error(`MqttClient id: ${dedicatedMqttClient.options.clientId} publishing error: ${mqttPublishError}`);
    } else {
      console.log(`MqttClient id: ${dedicatedMqttClient.options.clientId} published message: ${message}`);
    }
  });
}

module.exports = _sendMQTTMessage