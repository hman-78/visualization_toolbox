const _buildBoxplotOption = function (data, config) {
  var configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];
  //var configXAxisDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataIndexBinding"];
  //var configSeriesDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesDataIndexBinding"];

  var option = {};
  option = this._parseOption(configOption);
  if (option == null) {
    return null;
  }

  // initialize numbers

  var numberOfBoxplots = data.rows[0].length;
  var numberOfCategories = Number(data.rows[7][0]);
  var numberOfGroups = Number(numberOfBoxplots / numberOfCategories);
  var numberOfOutliers = 0;
  if (numberOfCategories == 1) {
    numberOfOutliers = data.rows.length - 8;
  }


  // data mapping xAxis
  option.xAxis.data = [];
  for (var i = 0; i < numberOfGroups; i++) {
    option.xAxis.data[i] = data.rows[6][i * numberOfCategories];
  }

  // initialization of series
  option.series = [];
  for (var i = 0; i < numberOfCategories; i++) {
    var serie = {};
    // Name of series is the category
    serie["name"] = data.rows[5][i];
    serie["type"] = 'boxplot';
    serie["data"] = [];
    for (var j = 0; j < numberOfGroups; j++) {
      var column = (j * numberOfCategories) + i;
      var dataElement = {};
      dataElement["name"] = data.rows[6][column];
      dataElement["value"] = [];
      for (var k = 0; k < 5; k++) {
        dataElement.value.push(data.rows[k][column]);
      }
      serie.data.push(dataElement);
    }
    option.series.push(serie);
  }
  if (numberOfCategories == 1) {
    //make first series looking nice 
    option.series[0]["itemStyle"] = {};
    option.series[0].itemStyle["borderColor"] = 'rgb(0, 126, 185)';
  }

  // map data of outliers
  if (numberOfOutliers > 0) {
    var serie = {};
    serie["name"] = 'Outlier';
    serie["type"] = 'scatter';
    serie["data"] = [];
    for (var i = 0; i < numberOfOutliers; i++) {
      for (var j = 0; j < numberOfGroups; j++) {
        var dataValue = data.rows[i + 8][j];
        if ("'-'" != dataValue) {

          var oData = [];
          oData.push(data.rows[6][j]);
          oData.push(dataValue);
          serie.data.push(oData);
        }
      }
    }
    option.series.push(serie);
  }
  return option;
}

module.exports = _buildBoxplotOption;