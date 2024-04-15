/**
 *  Method to map the search data from Splunk to the eChart instance for 'SimpleBoxplot' charts. 
 *  
 *  This data mapping requires the search to have a certain data structure:
 *  
 *  1. Per line of the search is the data for one boxplot
 *  2. The columns have to be in this specific order
 *      1. Name of Boxplot: It is used as Label in the X-Axis of the Chart
 *      2.           lower: A numerical value representing the lower value of the boxplot.
 *      3.              Q1: A numerical value representing the Q1 value of the boxplot.
 *      4.          median: A numerical value representing the median value of the boxplot.
 *      5.              Q3: A numerical value representing the Q3 value of the boxplot.
 *      6.           upper: A numerical value representing the uper value of the boxplot.
 *      7.        outliers: <optional> A set of '|' seperated numerical values providing all the values of the outliers of this boxplot. No outliers
 *                          will be visualized if value is empty.
 */
const _buildSimpleBoxplotOption = function (data, config) {
  var configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];

  var option = {};
  option = this._parseOption(configOption);
  if (option == null) {
    return null;
  }

  // check data structure and throw error in case of wrong data
  for (var i = 0; i < data.rows.length; i++) {
    if (data.rows[i].length < 6 || data.rows[i].length > 7) {
      var error = "Expected six or seven columns. Found ";
      error += data.rows[i].length + " columns in row .";
      error += i;
      error += ". Please provide the boxplot data with the following columns: <boxplot_name>, lower, Q1, median, Q3, upper, outliers (optionally)."
      throw error;
    }
  }



  // data mapping xAxis
  option.xAxis.data = [];
  for (var i = 0; i < data.rows.length; i++) {
    option.xAxis.data[i] = data.rows[i][0];
  }

  // initialization of series
  if (option.series == null) {
    option.series = [];
  } else if (!Array.isArray(option.series)) {
    // series is not yet an array. This is a problem
    // as we want to add the boxplots and outliers
    // as new series. Converting series to an array
    // keeping the data provided by the option config
    var seriesObject = option.series;
    option.series = [];
    option.series.push(seriesObject)
  } else if (Array.isArray(option.series)) {
    // keep data structure of series as is
  } else {
    throw "Unknown data structure of option.series. Please configure the series as array:  \"series\": []";
  }

  var serie = {};
  serie["type"] = 'boxplot';
  serie["data"] = [];

  for (var i = 0; i < data.rows.length; i++) {
    var dataElement = {};
    dataElement["name"] = data.rows[i][0];
    dataElement["value"] = [];
    for (var j = 1; j < 7; j++) {
      dataElement.value.push(data.rows[i][j]);
    }
    serie.data.push(dataElement);

  }
  option.series.push(serie);

  // check if optional outliers column is provided with data 
  var numberOfBoxplots = data.rows.length;
  var numberOfColumns = data.rows[0].length;
  if (numberOfBoxplots > 0 && numberOfColumns == 7) {
    // map data of outliers to serie 
    var serie = {};
    serie["name"] = 'Outlier';
    serie["type"] = 'scatter';
    serie["data"] = [];
    for (var i = 0; i < data.rows.length; i++) {

      var outliersRawData = data.rows[i][6];
      if (outliersRawData != null) {
        var outliers = outliersRawData.split("|");
        for (var j = 0; j < outliers.length; j++) {
          var dataObj = [];
          // push name of boxplot / x-axis value
          dataObj.push(data.rows[i][0]);
          // push value of outlier 
          dataObj.push(outliers[j]);
          serie.data.push(dataObj);
        }
      }
    }
    option.series.push(serie);
  }

  return option;
}

module.exports = _buildSimpleBoxplotOption;