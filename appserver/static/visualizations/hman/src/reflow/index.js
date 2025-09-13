const echarts = require('echarts');
// Override to respond to re-sizing events
const _reflow = function () {
  var myChart = echarts.getInstanceByDom(this.el);
  if (myChart != null) {
    let hasProperty = Object.prototype.hasOwnProperty.call(myChart, "resize");
    if (hasProperty) {
      // Resize chart
      myChart.resize();
    }
  }
}
module.exports = _reflow;