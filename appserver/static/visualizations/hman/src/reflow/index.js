// Override to respond to re-sizing events
const _reflow = function () {
  //console.log("refresh");
  var myChart = this.echarts.getInstanceByDom(this.el);
  if (myChart != null) {
    let hasProperty = myChart.hasOwnProperty("resize");
    if (hasProperty) {
      // Resize chart
      myChart.resize();
    }
  }
}
module.exports = _reflow;