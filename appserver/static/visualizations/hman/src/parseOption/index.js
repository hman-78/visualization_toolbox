/**
 * Parse the config option. Return null if there is a token
 * that is not yet replaced with a value in the configOption.
 * Return the config object in all other cases.
 *
 * Please note that tokens are strings within two $ characters.
 * Dollar character can be escaped by using $$.
 */
// eslint-disable-next-line
const echarts = require('echarts');

const _parseOption = function (configOption) {
  if (configOption == null || !Object.prototype.hasOwnProperty.call(configOption, "length")) {
    return null;
  }
  var option = {};
  // check if there is still a unreplaced $token$ in the config
  for (var i = 0; i < configOption.length; i++) {
    let character = configOption.charAt(i);
    if (character == '$' && !i !== configOption.length) {
      // there is a $ in the config and it is not escaped
      // with a second $
      let nextCharacter = configOption.charAt(i + 1);
      if (!(nextCharacter == '$')) {
        console.log("configOption contains unresolved token. Ignoring option.");
        return null;
      }
    }
  }
  eval("option =" + configOption);
  console.log("configOption does not contain unresolved tokens. Using option.")
  return option;
}

module.exports = _parseOption;