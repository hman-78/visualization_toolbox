/**
 *  Method to map the search data from Splunk to the eChart instance for 'custom' charts. 
 *  
 *  It was updated with additional features 
 *
 *   1. Support for series data that requires more than one dimension. Instead of providing the
 *      index of a row one can provide a ':' seperated list of indices that are mapped to an array
 *      of data.
 *      
 *      Example: 2:4:3 is mapped to series.data
 *      [[searchData[0][2],searchData[0][4],searchData[0][3]],
 *       [searchData[1][2],searchData[1][4],searchData[1][3]],...]
 *
 *   2. By providing exactly 2 row indices via the option errorDataIndexBinding one can implicitly
 *      add an additional series providing the level of confidence for each value. It is visualized
 *      as an error chart and mapped to an additional yAxis with min 0 and max 1.  
 *  
 *      Example: <option name="custom_chart_viz.bingyun.errorDataIndexBinding">5,6</option>
 *      is used to map row 5 and 6 to the error chart. Values of row 5 are the lower confidence
 *      interval and values of row 6 are the upper confidence interval. Values of the confidence
 *      interval have to be between 0 and 1.
 *      
 *      Implicitly the following preconditions have to be met:
 *      * yAxis in the option have to be an array or empty.
 *      * The new yAxis is added to the left with an offset of 80. All yAxis of the original chart
 *        have to avoid overlapping by setting their offset to a feasable value
 *      * to give the new yAxis the required space use     grid: { right: '20%' }, on the top level 
 *        of the options
 *      
 */
const _buildCustomOption = function (data, config) {
  var configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];
  var configXAxisDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataIndexBinding"];
  var configSeriesDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesDataIndexBinding"];
  var configErrorDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "errorDataIndexBinding"];
  var configSeriesColorDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesColorDataIndexBinding"];

  var option = {};
  option = this._parseOption(configOption);
  if (option == null) {
    return null;
  }

  // array with list of comma separated values provided in configXAxisDataIndexBinding
  var xAxisDataIndex = [];
  // array with list of comma separated values provided in configXAxisDataIndexBinding
  var seriesDataIndex = [];

  xAxisDataIndex = this._parseIndex(configXAxisDataIndexBinding);
  seriesDataIndex = this._parseIndex(configSeriesDataIndexBinding);
  //eslint-disable-next-line
  seriesColorDataIndexBinding = Number(configSeriesColorDataIndexBinding);

  for (let i = 0; i < seriesDataIndex.length; i++) {
    option.series[i].data = [];
    if (!option.series[i].name) {
      option.series[i].name = data.fields[seriesDataIndex[i]].name;
    }

  }

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
  for (let j = 0; j < xAxisDataIndex.length; j++) {
    // mapping only applies if user has not specified static data as xAxis.data[...]
    if (!Array.isArray(xAxisObjects[j].data) || xAxisObjects[j].data.length == 0) {
      xAxisObjects[j].data = [];
      for (let i = 0; i < data.rows.length; i++) {
        if (isNaN(xAxisDataIndex[j])) {
          throw "Wrong configuration of 'xAxisDataIndexBinding'. Please provide a number or a comma seperated list of numbers. 'xAxisDataIndexBinding': " + configXAxisDataIndexBinding;
        } else {
          xAxisObjects[j].data.push(data.rows[i][xAxisDataIndex[j]]);
        }
      }
    }
  }
  if (configXAxisDataIndexBinding != null) {
    if (Object.prototype.hasOwnProperty.call(option, "xAxis")) {
      option['xAxis'] = xAxisObjects;
    } else {
      option.xAxis = xAxisObjects;
    }
  }


  for (let i = 0; i < data.rows.length; i++) {
    for (let j = 0; j < seriesDataIndex.length; j++) {
      var dataObj = {
        value: 0,

      };
      if (isNaN(seriesDataIndex[j])) {
        // map list of rows to an array
        var mapping = [];
        var arrayData = [];
        mapping = seriesDataIndex[j];
        for (let k = 0; k < mapping.length; k++) {
          arrayData.push(data.rows[i][mapping[k]]);
        }
        dataObj.value = arrayData;
      } else {
        // map to a single row
        dataObj.value = data.rows[i][seriesDataIndex[j]];
      }
      // check if seriesColorDataIndexBinding is set
      // if yes map the color of the given row to the item style of the 
      // given series.data entry
      //eslint-disable-next-line
      if (!isNaN(seriesColorDataIndexBinding)) {
        dataObj['itemStyle'] = {};
        //eslint-disable-next-line
        dataObj.itemStyle.color = data.rows[i][seriesColorDataIndexBinding];
      }
      option.series[j].data.push(dataObj);
    }
  }

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
    for (let i = 0; i < data.rows.length; i++) {
      var errorData = [];
      errorData.push(i);
      errorData.push(data.rows[i][errorDataIndexSplit[0]]);
      errorData.push(data.rows[i][errorDataIndexSplit[1]]);
      errorSeries.data.push(errorData);
    }
    option.series.push(errorSeries);
    var optionErrorSeriesIndex = option.series.length - 1;

    // adding y-axis to map confidence from 0 to 1 over heigth of chart
    let checkYAxisProperty = Object.prototype.hasOwnProperty.call(option, "yAxis");
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
    if (Object.prototype.hasOwnProperty.call(option, "color") && option.color.length >= optionErrorSeriesIndex) {
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

module.exports = _buildCustomOption;