const echarts = require('echarts');
// Override to respond to re-sizing events
const _reflow = function () {
  var myChart = echarts.getInstanceByDom(this.el);
  if (myChart != null) {
    let hasProperty = Object.prototype.hasOwnProperty.call(myChart, "resize");
    if(this.scopedVariables['visualizationType'] === 'timeline') {
      const resizablePanel = document.querySelector('.shared-reportvisualizer.ui-resizable');
      const resizablePanelHeightInPx = resizablePanel.style.height;
      const intPanelHeight = parseInt(resizablePanelHeightInPx.replace('px', ''));
      const theChartHolder = myChart.getDom();
      const theChartScroller = theChartHolder.parentElement;
      if(intPanelHeight < this.scopedVariables['visualizationHeight']) {
        theChartHolder.style.height = `${this.scopedVariables['visualizationHeight']}px`;
        theChartScroller.style.display = 'flex';
        theChartScroller.style.overflowY = 'auto';
      } else {
        theChartHolder.style.height = '100%';
        theChartScroller.style.display = 'block';
        theChartScroller.style.overflowY = 'hidden';
      }
    }
    if (hasProperty) {
      myChart.resize();
    }
  }
}
module.exports = _reflow;