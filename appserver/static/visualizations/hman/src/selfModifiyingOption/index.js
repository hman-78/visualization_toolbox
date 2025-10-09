const echarts = require('echarts'); // eslint-disable-line no-unused-vars

const _selfModifiyingOption = function (data, config, option, hook) {
  this.evalHook = eval("(function a(data, config, option) {" + hook + "})");
  this.evalHook(data, config, option);
}

module.exports = _selfModifiyingOption;