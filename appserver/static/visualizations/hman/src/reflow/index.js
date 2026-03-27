const echarts = require('echarts');
// Override to respond to re-sizing events
const _reflow = function () {
  var myChart = echarts.getInstanceByDom(this.el);
  if (myChart != null) {
    let hasProperty = Object.prototype.hasOwnProperty.call(myChart, "resize");
    const currentChartEntry = this.scopedVariables['_renderedEchartsArray'].find(o => o.instanceByDom === myChart);
    if(currentChartEntry && currentChartEntry['visualizationType'] === 'timeline') {
      const theChartHolder = myChart.getDom();
      theChartHolder.parentElement.style.height = `${currentChartEntry['visualizationHeight']}px`;
      const resizablePanel = theChartHolder.closest('.shared-reportvisualizer.ui-resizable');
      if (resizablePanel) {
        resizablePanel.style.overflowY = resizablePanel.clientHeight < currentChartEntry['visualizationHeight'] ? 'scroll' : 'hidden';
      }
    }
    if (hasProperty) {
      myChart.resize();
    }
  }
}
module.exports = _reflow;