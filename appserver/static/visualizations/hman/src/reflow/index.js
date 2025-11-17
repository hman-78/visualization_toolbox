const echarts = require('echarts');
// Override to respond to re-sizing events
const _reflow = function () {
  var myChart = echarts.getInstanceByDom(this.el);
  if (myChart != null) {
    let hasProperty = Object.prototype.hasOwnProperty.call(myChart, "resize");
    if(this.scopedVariables['visualizationType'] === 'timeline') {
      const canvasHolder = myChart.getDom().firstChild;
      const theCanvas = myChart.getDom().firstChild.firstChild;
      theCanvas.setAttribute('height', this.scopedVariables['visualizationHeight']);
      theCanvas.style.height = `${this.scopedVariables['visualizationHeight']}px`;
      canvasHolder.style.overflowY = 'auto';
      canvasHolder.style.overflowX = 'hidden';
    }
    if (hasProperty) {
      // Resize chart
      myChart.resize();
    }
  }
}
module.exports = _reflow;