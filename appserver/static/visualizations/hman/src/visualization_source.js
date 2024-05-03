/**
MIT License

Copyright (c) 2022 hamann(visualization_toolbox@web.de)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Parts of the visualization_src.js and examples were taken from project
custom chart viz (https://github.com/bingyun123/custom_chart_viz), 
Copyright (c) 2020 bingyun(578210452@qq.com). These parts are licensed under 
the MIT license. See custom_chart_viz-LICENSE.md for additional details.
*/

/*
 * Visualization source
 */

const _buildBoxplotOption = require('./buildBoxplotOption');
const _buildCustomOption = require('./buildCustomOption');
const _buildSimpleBoxplotOption = require('./buildSimpleBoxplotOption');
const _createModal = require('./createModal');
const _drilldownToCategories = require('./drilldownToCategories');
const _drilldownToCategory = require('./drilldownToCategory');
const _drilldownToTimeRange = require('./drilldownToTimeRange');
const _drilldownToTimeRangeAndCategory = require('./drilldownToTimeRangeAndCategory');
const _formatData = require('./formatData');
const _getInitialDataParams = require('./getInitialDataParams');
const _handleAnnotation = require('./handleAnnotation');
const _initializeMQTT = require('./initializeMQTT');
const _parseIndex = require('./parseIndex');
const _parseOption = require('./parseOption');
const _reflow = require('./reflow');
const _selfModifiyingOption = require('./selfModifiyingOption');
const _selfModifiyingOptionWithReturn = require('./selfModifiyingOptionWithReturn');
const _sendMQTTMessage = require('./sendMQTTMessage')
const _updateView = require('./updateView');
const privateVars = require('./privateVars');
const PrivateVars = require('./privateVars');

define([
	'jquery',
	'underscore',
	'api/SplunkVisualizationBase',
	'api/SplunkVisualizationUtils',
	'echarts',
	'mqtt'
],
	function (
		$,
		_,
		SplunkVisualizationBase,
		SplunkVisualizationUtils,
		echarts,
		mqtt
	) {
		/** TODO mqtt clean up. The implementation of sending annotation data via mqtt should be hidden
			 *  behind a interface fassade. There might be other implementations of storing annotation data
			 *  on a server, for example by calling a REST API.
			 *
			 *  There should be an interface like AnnotationHandler that provides methods for initialization
			 *  and sending data to the server. Developers should be able to extend this interface with a implementation
			 *  like mqtt, REST etc.
			 */
		var mqttTopic = null;
		var mqttOptions = null;
		var mqttClient = null;

		// cleanup interfacing the echart functionality.
		// add MVC pattern to update the data of the chart
		// add annotation functionality to the interface

		// copy of data provided by updateView method
		var _data = null;

		// String of the config with the same name. Provides the index of the three columns with x, y and annotation data.
		var _annotationSeriesDataIndex = null;

		// index of the series visualizing the annotation data. option.series[_annotationSeriesIndex] has to point to the series.
		var _annotationSeriesIndex = null;
		// reference to the echart object
		var _myChart = null;
		// copy of the echart option that is currently visualized 
		var _option = null;

		// Extend from SplunkVisualizationBase
		const scopedVariables = new PrivateVars();
		return SplunkVisualizationBase.extend({



			initialize: function () {
				if (!scopedVariables.initialized) {
					SplunkVisualizationBase.prototype.initialize.apply(this, arguments);
					this.$el = $(this.el);
					var splunk = this;
					this.createModal(splunk);
					scopedVariables.initialized = true;
				}

			},

			// Optionally implement to format data returned from search. 
			// The returned object will be passed to updateView as 'data'
			formatData: function (data) {

				// Format data  
				return data;
			},

			// Implement updateView to render a visualization.
			//  'data' will be the data object returned from formatData or from the search
			//  'config' will be the configuration property object
			updateView: function (data, config) {
				_data = data;
				if (!data || !data.rows || data.rows.length < 1) {
					return;
				}
				this._initializeMQTT(data, config);

				console.log(data);
				console.log(JSON.stringify(data));

				var configDataType = config[this.getPropertyNamespaceInfo().propertyNamespace + "dataType"];

				var myChart = echarts.getInstanceByDom(this.el);
				if (myChart != null && this.myRingChart1 != '' &&
					myChart != undefined) {
					myChart.dispose() //Solve the error reported by echarts dom already loaded
				}
				myChart = echarts.init(this.el);
				var option = {};
				if (configDataType == "Custom") {
					option = this._buildCustomOption(data, config);
				} else if (configDataType == "Boxplot") {
					option = this._buildBoxplotOption(data, config);
				} else if (configDataType == "SimpleBoxplot") {
					option = this._buildSimpleBoxplotOption(data, config);
				}
				// tokens might not yet be replaced in the option. In this case we
				// don't want the echart to be shown yet, as it would result in an error.
				// Once the token is replaced this method is called again, option is parsed
				// and echart is shown to the user.
				if (option == null) {
					return;
				}
				var xAxisDataHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataHook"];
				var yAxisDataHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "yAxisDataHook"];
				var jsHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "jsHook"];
				var clickHook = config[this.getPropertyNamespaceInfo().propertyNamespace + "clickHook"];
				var annotationSeriesName = config[this.getPropertyNamespaceInfo().propertyNamespace + "annotationSeriesName"];

				if (xAxisDataHook != null) {
					option.xAxis.data = this.selfModifiyingOptionWithReturn(data, config, option, xAxisDataHook);
					console.log("Using option 'xAxisDataHook' is deprecated. Please use option 'jsHook' instead.")
				}
				if (yAxisDataHook != null) {
					option.yAxis.data = this.selfModifiyingOptionWithReturn(data, config, option, yAxisDataHook);
					console.log("Using option 'yAxisDataHook' is deprecated. Please use option 'jsHook' instead.")
				}
				if (jsHook != null) {
					this.selfModifiyingOption(data, config, option, jsHook);
				}
				if (clickHook != null) {
					myChart.on('click', onChartClick);
				}
				if (annotationSeriesName != null) {
					this._handleAnnotation(data, config, option, annotationSeriesName, myChart);
				}

				console.log(option);
				myChart.setOption(option);
				_myChart = myChart;
				_option = option;

				var splunk = this;

				// Function called by click on chart if option clickHook is enabled
				// Used to call the Javascript Code provided by the option clickHook to
				// set tokens for drill down
				function onChartClick(params) {
					console.log(params);
					this.evalHook = eval("(function a(params, data, config, option, event, splunk) {" + clickHook + "})");
					this.evalHook(params, data, config, option, params.event, splunk);
				}
			},

			selfModifiyingOptionWithReturn: function (data, config, option, hook) {

				this.evalHook = eval("(function a(data, config, option) {" + hook + "})");
				var rtn = this.evalHook(data, config, option);
				return rtn;
			},

			selfModifiyingOption: function (data, config, option, hook) {

				this.evalHook = eval("(function a(data, config, option) {" + hook + "})");
				this.evalHook(data, config, option);
			},


			// Search data params
			getInitialDataParams: function () {
				return ({
					outputMode: SplunkVisualizationBase.ROW_MAJOR_OUTPUT_MODE,
					count: 50000
				});
			},

			// Override to respond to re-sizing events
			reflow: function () {
				//console.log("refresh");

				var myChart = echarts.getInstanceByDom(this.el);
				if (myChart != null) {
					let hasProperty = myChart.hasOwnProperty("resize");
					if (hasProperty) {
						// Resize chart
						myChart.resize();
					}
				}
			},


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
			_buildCustomOption: function (data, config) {
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
				seriesColorDataIndexBinding = Number(configSeriesColorDataIndexBinding);

				for (var i = 0; i < seriesDataIndex.length; i++) {
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


				for (var i = 0; i < data.rows.length; i++) {
					for (var j = 0; j < seriesDataIndex.length; j++) {
						var dataObj = {
							value: 0,

						};
						if (isNaN(seriesDataIndex[j])) {
							// map list of rows to an array
							var mapping = [];
							var arrayData = [];
							mapping = seriesDataIndex[j];
							for (var k = 0; k < mapping.length; k++) {
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
						if (!isNaN(seriesColorDataIndexBinding)) {
							dataObj['itemStyle'] = {};
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
			},

			_parseIndex: function (str) {
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
			},

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
			_buildSimpleBoxplotOption: function (data, config) {
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
			},


			_buildBoxplotOption: function (data, config) {
				var configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];
				var configXAxisDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataIndexBinding"];
				var configSeriesDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesDataIndexBinding"];

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
			},

			/**
			 * Parse the config option. Return null if there is a token
			 * that is not yet replaced with a value in the configOption.
			 * Return the config object in all other cases.
			 *
			 * Please note that tokens are strings within two $ characters.
			 * Dollar character can be escaped by using $$.
			 */
			_parseOption: function (configOption) {
				if (configOption == null || !configOption.hasOwnProperty('length')) {
					return null;
				}
				var option = {};
				// check if there is still a unreplaced $token$ in the config
				for (var i = 0; i < configOption.length; i++) {
					let character = configOption.charAt(i);
					if (character == '$' && !i !== configOption.length) {
						// there is a $ in the config and it is not escaped
						// with a second $
						let nextCharacter = configOption.charAt(i + 1);
						if (!(nextCharacter == '$')) {
							console.log("configOption contains unresolved token. Ignoring option.");
							return null;
						}
					}
				}
				eval("option =" + configOption);
				console.log("configOption does not contain unresolved tokens. Using option.")
				return option;
			},

			_sendMQTTMessage: function (message) {
				console.log(message);

				mqttClient.publish(mqttTopic, message, { qos: 0, retain: false }, (error) => {
					if (error) {
						console.error(error);
					} else {
						console.log("message published: " + message);
					}
				});
			},

			_initializeMQTT: function (data, config) {
				const mqtt = require('mqtt');
				var useMQTT = false;
				try {
					var configMqttUser = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttUser"];
					var configMqttPassword = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttPassword"];
					var configMqttTopic = config[this.getPropertyNamespaceInfo().propertyNamespace + "mqttTopic"];
					//var configMqttPath = config[this.getPropertyNamespaceInfo().propertyNamespace +"mqttPath"];
					if (configMqttUser != null && configMqttPassword != null && configMqttTopic != null) {
						useMQTT = true;
					}
				} catch (e) {
					useMQTT = false;
				}

				if (useMQTT) {
					var clientId = Math.random().toString(23);

					var options = {
						clientId: clientId,
						connectTimeout: 5000,
						hostname: 'mqtt01.heraeus.com',
						protocol: 'wss',
						path: '/mqtt',
						port: 8443,
						username: configMqttUser,
						password: configMqttPassword
					}
					mqttClient = mqtt.connect(options);
					mqttClient.on('connect', () => {
						console.log('Connected')

					})
				}

				// TODO cleanup mqtt
				mqttTopic = configMqttUser + "/" + clientId + configMqttTopic;
				mqttOptions = options;

			},

			/**
			 * To be called from the visualization's click handler, after computing the
			 * correct time range from the target of the click.
			 *
			 * @param earliestTime - the lower bound of the time range,
			 *          can be an ISO-8601 timestamp or an epoch time in seconds.
			 * @param latestTime - the upper bound of the time range,
			 *          can be an ISO-8601 timestamp or an epoch time in seconds.
			 * @param browserEvent - the original browser event that caused the drilldown
			 *
			 * example usage:
			 *
			 * this.drilldownToTimeRange('1981-08-18T00:00:00.000-07:00', '1981-08-19T00:00:00.000-07:00', e);
			 */
			drilldownToTimeRange: function (earliestTime, latestTime, browserEvent) {
				this.drilldown({
					earliest: earliestTime,
					latest: latestTime
				}, browserEvent);
			},

			/**
			 * To be called from the visualization's click handler, after computing the
			 * correct category name and value from the target of the click.
			 *
			 * @param categoryName - the field name for the category
			 * @param categoryFieldValue - the value for the category
			 * @param browserEvent - the original browser event that caused the drilldown
			 *
			 * example usage:
			 *
			 * this.drilldownToCategory('State', 'Oregon', e);
			 */
			drilldownToCategory: function (categoryName, categoryFieldValue, browserEvent) {
				var data = {};
				data[categoryName] = categoryFieldValue;

				this.drilldown({
					action: SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN,
					data: data
				}, browserEvent);
			},

			/**
			 * To be called from the visualization's click handler, after computing the
			 * correct category name, value AND time range from the target of the click.
			 * 
			 * Combines the two calls drilldownToCategory and drilldownToTimeRange.
			 * 
			 * 
			 *			
				*/
			drilldownToTimeRangeAndCategory: function (earliestTime, latestTime, categoryName, categoryValue, browserEvent) {
				var data = {};
				data[categoryName] = categoryValue;

				this.drilldown({
					action: SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN,
					data: data,
					earliest: earliestTime,
					latest: latestTime
				}, browserEvent);
			},


			/**
			 * To be called from the visualization's click handler, after computing the
			 * correct category names and values.
			 * 		
			 */
			drilldownToCategories: function (categoryNames, categoryValues, browserEvent) {
				var data = {};
				if (categoryNames != null) {
					for (var i = 0; i < categoryNames.length; i++) {
						data[categoryNames[i]] = categoryValues[i];
					}
				}
				this.drilldown({
					action: SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN,
					data: data
				}, browserEvent);
			},

			_handleAnnotation: function (data, config, option, annotationsSeriesName, myChart) {

				var configXAxisDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "xAxisDataIndexBinding"];
				var configSeriesDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesDataIndexBinding"];
				var opco = config[this.getPropertyNamespaceInfo().propertyNamespace + "opco"];
				// first index points to x, second to y and third to the index of the annotation
				var annotationSeriesDataIndexBinding = config[this.getPropertyNamespaceInfo().propertyNamespace + "annotationSeriesDataIndexBinding"];

				var annotationSeriesDataIndex = [];
				annotationSeriesDataIndex = this._parseIndex(annotationSeriesDataIndexBinding);
				_annotationSeriesDataIndex = annotationSeriesDataIndex;

				if (annotationSeriesDataIndex.length != 3) {
					var error = "Please provide the configuration annotationSeriesDataIndexBinding. It has to be 3 numbers separated by a comma.\n"
					var error = error + "1. Index of the column providing the x-value of the annotated series.\n"
					var error = error + "2. Index of the column providing the y-value of the annotated series.\n"
					var error = error + "3. Index of the column providing the annotation value.\n"
					var error = error + "Example: 0,1,2\n"
					var error = error + "0 indicates that the first column is used as the x-value of the annotation.\n"
					var error = error + "1 indicates that the second column is used as the y-value of the annotation.\n"
					var error = error + "2 indicates that the third column providing the value.\n"

					throw error
				}
				// we use the DOM tree to store some values to make them available in the click listeners
				document.getElementById("annotationSeriesNameContainer").textContent = annotationsSeriesName;
				document.getElementById("opcoContainer").textContent = opco;

				myChart.on('click', (function (option) {
					return function (params) {

						var annotationSeriesName = document.getElementById("annotationSeriesNameContainer").textContent;


						if (annotationSeriesName != null) {
							var xValue;
							var xAxisValue;
							var yValue = params.value;
							if (params.seriesName === annotationSeriesName) {

								if (option === null || option.xAxis === null || !Array.isArray(option.xAxis) ||
									option.xAxis.length == 0 || option.xAxis[0].type === null) {
									throw new Error("xAxis.type missing in option");
								}
								// according to the echart documentation the x value has to be read from different
								// attributes of the params depending on the type of the x Axis
								if (option.xAxis[0].type === "time") {
									// x Axis of type time is an expeptional case. We get unix time in the search
									// but splunk converts it to a readable format based on the local time of the user
									// We would run into problems if the local time would be used as part of the key in 
									// the database. The solution is to store the unix time instead of the local time.
									// This is the reason why the user has to provide the unix time in the dimension "value"
									// of the x axis data.
									if (Array.isArray(params.dimensionNames) && params.dimensionNames.length > 0) {
										for (var i = 0; i < params.dimensionNames.length; i++) {
											if ("x" === params.dimensionNames[i]) {
												xAxisValue = params.value[i];
											} else if ("value" === params.dimensionNames[i]) {
												xValue = params.value[i];
											}
										}
									}
								} else if (option.xAxis[0].type === "category") {
									xValue = params.name;
									xAxisValue = xValue;

								} else if (option.xAxis[0].type === "value") {
									if (Array.isArray(params.dimensionNames) && params.dimensionNames.length > 0) {
										for (var i = 0; i < params.dimensionNames.length; i++) {
											if ("x" === params.dimensionNames[i]) {
												xValue = params.value[i];
												xAxisValue = xValue;
											}
										}
									}
								}

								if (Array.isArray(params.dimensionNames) && params.dimensionNames.length > 0) {
									for (var i = 0; i < params.dimensionNames.length; i++) {
										if ("y" === params.dimensionNames[i]) {
											yValue = params.value[i];
										}
									}
								}

								// store hidden values in the DOM tree
								document.getElementById("xValue").textContent = xValue;
								document.getElementById("xAxisValue").textContent = xAxisValue;
								document.getElementById("yValue").textContent = yValue;

								var descriptionInput = document.getElementById("descriptionInput");
								descriptionInput.focus();
								descriptionInput.select();

								for (var i = 0; i < _option.series[_annotationSeriesIndex].data.length; i++) {
									var obj = _option.series[_annotationSeriesIndex].data[i];
									var x = obj[0];
									if (xAxisValue == x) {
										var description = obj[2];
										descriptionInput.value = description;
									}

								}

								$("#xValueContainer").text("X Value: " + xAxisValue); // Update X value in the modal_annotation
								$("#yValueContainer").text("Y Value: " + yValue); // Update Y value in the modal_annotation
								var modal_annotationElement = document.getElementById("myModal_annotation")
								modal_annotationElement.style.display = "block";
							}
						}
					}
				})(option));

				if (annotationSeriesDataIndexBinding == null) {
					var error = "Missing configuration. Please provide a config named 'annotationSeriesDataIndexBinding' with the index of the column that contains the annotation data.";
					throw error;
				} else {
					var annotationSeries = {
						type: 'scatter',
						symbol: 'pin',
						symbolSize: 15,
						data: [],
						itemStyle: {
							color: '#ff6600', // Set the color of the annotation symbols
							opacity: 1, // Adjust the opacity of the annotation symbols
							borderColor: '#000', // Set the border color of the annotation symbols
							borderWidth: 1 // Set the border width of the annotation symbols
						},
						label: {
							show: true, // Display the annotation text
							formatter: function (param) {
								return param.value[2]; // Show the annotation text
							},
							position: 'top' // Position the annotation text above the symbols
						}
					};
					annotationSeries["data"] = [];
					annotationSeries["name"] = annotationsSeriesName + " annotation";
					for (var i = 0; i < data.rows.length; i++) {
						var annotationValue = data.rows[i][annotationSeriesDataIndex[2]];
						if (annotationValue != null && "" != annotationValue && "'-'" != annotationValue) {
							var annotationData = [];
							annotationData.push(data.rows[i][annotationSeriesDataIndex[0]]);
							annotationData.push(data.rows[i][annotationSeriesDataIndex[1]]);
							annotationData.push(data.rows[i][annotationSeriesDataIndex[2]]);
							annotationSeries.data.push(annotationData);
						}
					}
					_annotationSeriesIndex = option.series.length;
					option.series.push(annotationSeries);
				}

			},

			createModal: function (splunk) {
				var h2 = $("<h2>").text("Add Annotation");
				var xValueSpan = $("<span>").addClass("x-value");
				var yValueSpan = $("<span>").addClass("y-value");
				var modal_annotationContent = $("<div>").addClass("modal_annotation-content").append(header, body, footer);

				var opcoContainer = $("<div>").addClass("value-container").attr("id", "opcoContainer").css("display", "none");;
				$(".modal_annotation-content").append(opcoContainer);

				var annotationSeriesName = $("<div>").addClass("annotation-series-name").attr("id", "annotationSeriesNameContainer").css("display", "none");
				$(".modal_annotation-content").append(annotationSeriesName);

				var opcoElement = $("<div>")
					.addClass("opco")
					.attr("id", "opcoContainer").css("display", "none");

				//var xValueContainer = $("<span>")
				var xValueContainer = $("<div>")

					.addClass("x-value-container")
					.text("Current X Value: ")
					//.append($("<span>").addClass("x-value")); // This span will hold the current x-axis value
					//.append(xValueSpan);
					.append(xValueSpan)[0]; // Get the DOM element from jQuery object
				//.attr("id", "xValueContainer"); // Add ID to the xValueContainer element
				xValueContainer.id = "xValueContainer"; // Add ID to the xValueContainer element

				var xValueElement = $("<div>").attr("id", "xValue").css("display", "none");;
				var xAxisValueElement = $("<div>").attr("id", "xAxisValue").css("display", "none");;


				//var yValueContainer = $("<span>")
				var yValueContainer = $("<div>")
					.addClass("y-value-container")
					.text("Current Y Value: ")
					//.append(yValueSpan);
					//.attr("id", "yValueContainer"); // Add ID to the yValueContainer element
					.append(yValueSpan)[0]; // Get the DOM element from jQuery object
				yValueContainer.id = "yValueContainer"; // Add ID to the yValueContainer element
				var yValueElement = $("<div>").attr("id", "yValue").css("display", "none");;


				function clearModalData() {
					descriptionInput.val("");
					$(".modal_annotation").css("display", "none");
					document.getElementById("descriptionInput").value = "";
					document.getElementById("xValueContainer").textContent = "";
					document.getElementById("yValueContainer").textContent = "";
				}

				var closeSpan = $("<span>")
					.addClass("close")
					.click(clearModalData);

				var header = $("<div>")
					.addClass("write-the-discription")
					.append(closeSpan, h2, xValueContainer, yValueContainer, opcoElement, annotationSeriesName, xValueElement, xAxisValueElement, yValueElement);


				var p = $("<p>").text("Description");
				var descriptionInput = $("<input>")
					.attr("type", "text")
					.attr("placeholder", "Enter Description").attr("id", "descriptionInput").attr("autocomplete", "off").attr("class", "wide-input");


				// var body = $("<div>").addClass("modal_annotation-body").append(p, descriptionInput, keyLabel, keyInput);
				var body = $("<div>").addClass("modal_annotation-body").append(p, descriptionInput);


				var cancelButton = $("<button>")
					.attr("id", "cancelButton")
					.text("Cancel")
					.addClass("shadow-button")
					.click(clearModalData);



				var saveButton = $("<button>")
					.attr("id", "saveButton")
					.text("Save")
					.addClass("shadow-button")
					.css({
						"background-color": "#32CD32",
						"border-color": "#32CD32"
					});



				var footer = $("<div>").addClass("modal_annotation-footer").append(cancelButton, saveButton);

				var content = $("<div>").addClass("modal_annotation-content").append(header, body, footer);
				var modal_annotation = $("<div>")
					.addClass("modal_annotation")
					.attr("id", "myModal_annotation")
					.css("display", "none")
					.append(content);

				$("body").append(modal_annotation);

				document.getElementById("saveButton").addEventListener("click", function (splunk) {
					return function () {


						var descriptionInput = document.getElementById("descriptionInput");
						var description = descriptionInput.value;
						var annotationSeriesName = document.getElementById("annotationSeriesNameContainer").textContent;
						var opco = document.getElementById("opcoContainer").textContent;
						var xValue = document.getElementById("xValue").textContent;
						var xAxisValue = document.getElementById("xAxisValue").textContent;
						var yValue = document.getElementById("yValue").textContent;


						var msgJson = {
							"type": "annotation",
							"action": "add",
							"opco": opco,
							"name": annotationSeriesName,
							"x": xValue,
							"annotation": description,
							"tags": ""
						};


						splunk._sendMQTTMessage(JSON.stringify(msgJson));

						for (var i = 0; i < _data.rows.length; i++) {
							var x = _data.rows[i][_annotationSeriesDataIndex[0]];
							var y = _data.rows[i][_annotationSeriesDataIndex[1]];
							var annotation = _data.rows[i][_annotationSeriesDataIndex[2]];

							// to avoid a refresh of the panel the annotation with the matching x value is updated with the new annoation
							if (xAxisValue == x) {
								_data.rows[i][_annotationSeriesDataIndex[2]] = description;
							}

						}
						var isAnnotationAlreadyInData = false;
						var indexToBeDeleted = null;
						for (var i = 0; i < _option.series[_annotationSeriesIndex].data.length; i++) {
							var obj = _option.series[_annotationSeriesIndex].data[i];
							var x = obj[0];
							if (xAxisValue == x) {
								isAnnotationAlreadyInData = true;
								if ("" == description) {
									// remove data from series
									indexToBeDeleted = i;
									obj[2] = "";
									_option.series[_annotationSeriesIndex].data.splice(i, 1);
									// TODO remove empty data obj from array
								} else {
									// update new value
									obj[2] = description;
								}
							}

						}

						if (!isAnnotationAlreadyInData) {
							var obj = [];
							obj.push(xAxisValue);
							obj.push(yValue);
							obj.push(description);
							_option.series[_annotationSeriesIndex].data.push(obj);
						}
						_myChart.setOption(_option);


						// Hide the modal_annotation after saving
						$(".modal_annotation").css("display", "none");
						// reset description
						document.getElementById("descriptionInput").value = "";
						document.getElementById("xValueContainer").text = "";
						document.getElementById("yValueContainer").text = "";


					};
				}(splunk));

				document.getElementById("descriptionInput").addEventListener('keyup', (event) => {
					if (event.key === 'Enter') {
						// Call the click listener of the saveButton when Enter key is pressed
						document.getElementById("saveButton").click();
					}
				});

				// When the user clicks anywhere outside of the modal_annotation, close it
				window.onclick = function (event) {
					var modal_annotationElement = document.getElementById("myModal_annotation");
					if (event.target == modal_annotationElement) {
						modal_annotationElement.style.display = "none";
						document.getElementById("descriptionInput").value = "";
						document.getElementById("xValueContainer").text = "";
						document.getElementById("yValueContainer").text = "";
					}
				}
			}
		});
	});