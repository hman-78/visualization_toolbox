const _sendMQTTMessage = function (message) {
  console.log(`_sendMQTTMessage: ${message}`);
  this.scopedVariables['mqttClient'].publish(this.scopedVariables['mqttTopic'], message, { qos: 0, retain: false }, (error) => {
    if (error) {
      console.error(error);
    } else {
      console.log("message published: " + message);
    }
  });
}

module.exports = _sendMQTTMessage