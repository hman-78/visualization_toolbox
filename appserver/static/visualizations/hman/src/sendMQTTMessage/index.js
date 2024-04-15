const _sendMQTTMessage = function (message) {
  console.log(message);
  mqttClient.publish(mqttTopic, message, { qos: 0, retain: false }, (error) => {
    if (error) {
      console.error(error);
    } else {
      console.log("message published: " + message);
    }
  });
}

module.exports = _sendMQTTMessage