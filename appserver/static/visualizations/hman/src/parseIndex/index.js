const _parseIndex = function (str) {
  var seriesDataIndex = [];
  if (str == null || str.length == 0) {
    return seriesDataIndex;
  }
  var seriesDataIndexSplit = str.split(",");
  for (var i = 0; i < seriesDataIndexSplit.length; i++) {
    if (isNaN(seriesDataIndexSplit[i])) {
      // mapping a list of rows to an array. This is usefull if series.data expects an array of data
      var seriesDataIndexOfIndexSplit = [];
      var arrayData = [];
      var mapping = String(seriesDataIndexSplit[i]);
      mapping = mapping.substring(1, mapping.length - 1);
      seriesDataIndexOfIndexSplit = mapping.split(";");
      for (var j = 0; j < seriesDataIndexOfIndexSplit.length; j++) {
        arrayData[j] = Number(seriesDataIndexOfIndexSplit[j]);
      }
      seriesDataIndex[i] = arrayData;
    } else {
      // mapping to a single row
      seriesDataIndex[i] = Number(seriesDataIndexSplit[i]);
    }
  }
  return seriesDataIndex;
}

module.exports = _parseIndex;