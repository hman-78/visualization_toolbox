
const _buildDynamicOption = function (data, config) {
  var configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];
  var configXAxisDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataIndexBinding"];
  var configSeriesDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesDataIndexBinding"];
  var configErrorDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "errorDataIndexBinding"];
  var option = {};
  option = this._parseOption(configOption);
  if (option == null) {
    return null;
  }

  // array with list of comma separated values provided in configXAxisDataIndexBinding
  var xAxisDataIndex = [];
  xAxisDataIndex = this._parseIndex(configXAxisDataIndexBinding);

  var seriesDataIndexes = configSeriesDataIndexBinding.split(";").map(Number);

  // xAxis can be configured as option.xAxis instance or as option.xAxis[] array
  // we map the xAxis option to the array xAxisObjects to make it easier for
  // the mapping logic
  var xAxisObjects = [];
  if (xAxisDataIndex.length == 1) {
    if (!Array.isArray(option.xAxis)) {
      // option.xAxis is is not an array, so a single instance is provided in the config
      xAxisObjects[0] = option.xAxis;
    } else {
      // it is an array but as only one xAxisDataIndex is provided the array should be of size 1
      if (option.xAxis.length != 1) {
        throw "Wrong configuration of 'xAxisDataIndexBinding: '" + configXAxisDataIndexBinding + ". You provided one value in 'xAxisDataIndexBinding'. Expecting also one xAxis configuration but found " + option.xAxis.length != 1;
      } else {
        // it is of size 1, so xAxisObjects can be copied
        xAxisObjects = option.xAxis;
      }
    }
  } else if (xAxisDataIndex.length > 1) {
    if (Array.isArray(option.xAxis)) {
      xAxisObjects = option.xAxis;
    }
  }

  if (xAxisObjects.length != xAxisDataIndex.length) {
    throw "Wrong configuration of 'xAxisDataIndexBinding: '" + configXAxisDataIndexBinding + ". The number of option.xAxis instances is not matching the number of comma separated values in 'xAxisDataIndexBinding'.";
  }

  // mapping of xAxis values to xAxisObjects
  for (var j = 0; j < xAxisDataIndex.length; j++) {
    // mapping only applies if user has not specified static data as xAxis.data[...]
    if (!Array.isArray(xAxisObjects[j].data) || xAxisObjects[j].data.length == 0) {
      xAxisObjects[j].data = [];
      for (var i = 0; i < data.rows.length; i++) {
        if (isNaN(xAxisDataIndex[j])) {
          throw "Wrong configuration of 'xAxisDataIndexBinding'. Please provide a number or a comma seperated list of numbers. 'xAxisDataIndexBinding': " + configXAxisDataIndexBinding;
        } else {
          xAxisObjects[j].data.push(data.rows[i][xAxisDataIndex[j]]);
        }
      }
    }
  }
  if (configXAxisDataIndexBinding != null) {
    if (option.hasOwnProperty('xAxis')) {
      option['xAxis'] = xAxisObjects;
    } else {
      option.xAxis = xAxisObjects;
    }
  }

  // Default settings possibly defined in Splunk's dynamicOptions
  var defaultName = option.dynamicOptions.defaultName || 'Series ';
  var defaultType = option.dynamicOptions.defaultType || 'line';
  var defaultSmooth = option.dynamicOptions.defaultSmooth || false;
  var defaultConnectNulls = option.dynamicOptions.defaultConnectNulls || true;
  var defaultShowSymbol = option.dynamicOptions.defaultShowSymbol || false;

  var onlyDrawSpecified = option.dynamicOptions.onlyDrawSpecified || false;

  const seriesList = [];

  // A helper function to create series data
  function createSeries(seriesName, seriesType, seriesDataIndex, seriesSmooth, seriesConnectNulls, seriesShowSymbol) {
    var data_array = data.rows.map(function (row) {
      return [row[0], row[seriesDataIndex]];
    });
    return {
      name: seriesName,
      type: seriesType,
      smooth: seriesSmooth,
      connectNulls: seriesConnectNulls,
      showSymbol: seriesShowSymbol,
      data: data_array
    };
  }

  // Generate series that are explicitly specified
  for (var i = 0; i < seriesDataIndexes.length; i++) {
    var seriesName = option.series && option.series[i] && option.series[i].name ? option.series[i].name : defaultName + (i + 1);
    var seriesType = option.series && option.series[i] && option.series[i].type ? option.series[i].type : defaultType;
    var seriesSmooth = option.series && option.series[i] && option.series[i].smooth ? option.series[i].smooth : defaultSmooth;
    var seriesConnectNulls = option.series && option.series[i] && option.series[i].connectNulls ? option.series[i].connectNulls : defaultConnectNulls;
    var seriesShowSymbol = option.series && option.series[i] && option.series[i].showSymbol ? option.series[i].showSymbol : defaultShowSymbol;

    seriesList.push(createSeries(seriesName, seriesType, seriesDataIndexes[i], seriesSmooth, seriesConnectNulls, seriesShowSymbol));
  }

  // If not onlyDrawSpecified, generate all series with default settings
  if (!onlyDrawSpecified) {
    for (var i = 1; i < data.fields.length; i++) {
      // If the series is already specified, skip it
      if (seriesDataIndexes.indexOf(i) !== -1) continue;

      seriesList.push(createSeries(defaultName + i, defaultType, i, defaultSmooth, defaultConnectNulls, defaultShowSymbol));
    }
  }

  option.series = seriesList;

  if (configErrorDataIndexBinding != null) {
    // adding an error bar chart to the list of series

    // parsing the rows indices of the error data
    var errorDataIndexSplit = configErrorDataIndexBinding.split(",");
    if (errorDataIndexSplit.length != 2) {
      throw "errorDataIndexBinding should configure exacly two numbers, for example 5,7";
    }

    var errorSeries = {
      type: 'custom',
      name: 'Confidence',
      itemStyle: {
        normal: {
          borderWidth: 1.5
        }
      },
      renderItem: function (params, api) {
        var xValue = api.value(0);
        var highPoint = api.coord([xValue, api.value(1)]);
        var lowPoint = api.coord([xValue, api.value(2)]);
        var halfWidth = api.size([1, 0])[0] * 0.1;
        var style = api.style({
          stroke: api.visual('color'),
          fill: null
        });

        return {
          type: 'group',
          children: [{
            type: 'line',
            transition: ['shape'],
            shape: {
              x1: highPoint[0] - halfWidth, y1: highPoint[1],
              x2: highPoint[0] + halfWidth, y2: highPoint[1]
            },
            style: style
          }, {
            type: 'line',
            transition: ['shape'],
            shape: {
              x1: highPoint[0], y1: highPoint[1],
              x2: lowPoint[0], y2: lowPoint[1]
            },
            style: style
          }, {
            type: 'line',
            transition: ['shape'],
            shape: {
              x1: lowPoint[0] - halfWidth, y1: lowPoint[1],
              x2: lowPoint[0] + halfWidth, y2: lowPoint[1]
            },
            style: style
          }]
        };
      },
      data: [],
      z: 100
    };
    errorSeries["data"] = [];
    for (var i = 0; i < data.rows.length; i++) {
      var errorData = [];
      errorData.push(i);
      errorData.push(data.rows[i][errorDataIndexSplit[0]]);
      errorData.push(data.rows[i][errorDataIndexSplit[1]]);
      errorSeries.data.push(errorData);
    }
    option.series.push(errorSeries);
    var optionErrorSeriesIndex = option.series.length - 1;

    // adding y-axis to map confidence from 0 to 1 over heigth of chart
    let checkYAxisProperty = option.hasOwnProperty('yAxis');
    if (!checkYAxisProperty) {
      option["yAxis"] = [];
    }
    // adding yAxis confidence standard object
    var yAxisObj = {
      type: "value",
      name: "Confidence Interval",
      nameRotate: 90,
      nameLocation: "middle",
      nameGap: 40,
      position: 'right',
      offset: 80,
      min: 0,
      max: 1,
      axisLine: {
        lineStyle: {
        }
      },
      axisLabel: {
      }
    }

    // determine color of errorSeries to color yAxis
    var colorString = "";
    if (option.hasOwnProperty('color') && option.color.length >= optionErrorSeriesIndex) {
      colorString = option.color[optionErrorSeriesIndex];
      yAxisObj.axisLine.lineStyle.color = colorString;
      yAxisObj.axisLabel.color = colorString;
    }

    option.yAxis.push(yAxisObj);
    // adding value of yAxisIndex to errorSeries
    option.series[option.series.length - 1]["yAxisIndex"] = option.yAxis.length - 1;
  }

  return option;
}

module.exports = _buildDynamicOption;