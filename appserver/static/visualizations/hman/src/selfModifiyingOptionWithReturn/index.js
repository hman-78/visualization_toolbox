const echarts = require('echarts');

const _selfModifiyingOptionWithReturn = function (data, config, option, hook) {
  this.evalHook = eval("(function a(data, config, option) {" + hook + "})");
  var rtn = this.evalHook(data, config, option);
  return rtn;
}

module.exports = _selfModifiyingOptionWithReturn;