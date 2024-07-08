const _sendMQTTMessage = function (dedicatedMqttClient, dedicatedMqttTopic, message) {
  console.log(`_sendMQTTMessage: ${message}`);
  dedicatedMqttClient.publish(dedicatedMqttTopic, message, { qos: 0, retain: false }, (error) => {
    if (mqttPublishError) {
      console.error(`MqttClient id: ${dedicatedMqttClient} publishing error: ${mqttPublishError}`);
    } else {
      console.log(`MqttClient id: ${dedicatedMqttClient} published message: ${message}`);
    }
  });
}

module.exports = _sendMQTTMessage