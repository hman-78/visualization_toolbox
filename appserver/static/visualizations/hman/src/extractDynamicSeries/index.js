const _extractDynamicSeries = function(typedSeriesDataIdBinding) {
    let tmpResult = {
      dynamicSeries: null,
      staticSeries: []
    };
    let tmpArray = typedSeriesDataIdBinding.split(',');
    tmpArray.forEach(el => {
      if(isNaN(el)) {
        if(el !== '*') {
          el = el.replace('[', '');
          el = el.replace(']', '');
          el = el.split('-');
        }
        tmpResult.dynamicSeries = el;
      } else {
        tmpResult.staticSeries.push(el);
      }
    });
    tmpResult.staticSeries = tmpResult.staticSeries.sort(function(a, b) {
      return a - b;
    });
    return tmpResult;
  }

  module.exports = _extractDynamicSeries;