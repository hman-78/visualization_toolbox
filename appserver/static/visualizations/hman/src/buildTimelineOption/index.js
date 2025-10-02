const SplunkVisualizationUtils = require('api/SplunkVisualizationUtils');
const echarts = require('echarts');
const lodashFind = require('lodash.find');

let processedData = [];
let optionFromXmlDashboard = {};
let processedLegends = [];
let manuallyAddedLegends = [];
let manuallySelectedLegends = {};
let processedCategories = [];
let tmpLocaleOption = 'en-GB';
let xAxisDataMinValue = '';
let xAxisDataMaxValue = '';
let xAxisStartDates = [];
let yAxisListedHours = [];
let hourlyIntervals = [];
const currentTheme = SplunkVisualizationUtils.getCurrentTheme();
const genericTextColor = currentTheme === 'dark' ? '#fff' : '#000';
if (typeof window._i18n_locale !== 'undefined' && typeof window._i18n_locale.locale_name !== 'undefined') {
  tmpLocaleOption = window._i18n_locale.locale_name.replace('_', '-');
}

function reInitializeDataHolders() {
  processedData = [];
  optionFromXmlDashboard = {};
  processedLegends = [];
  manuallyAddedLegends = [];
  manuallySelectedLegends = {};
  processedCategories = [];
  xAxisDataMinValue = '';
  xAxisDataMaxValue = '';
  xAxisStartDates = [];
  yAxisListedHours = [];
  hourlyIntervals = [];
}

function renderItemForHour(params, api) {
  // 1. Initialize the counter on the context object
  if (params.context.counter === undefined) {
    params.context.counter = 0;
  }

  // Use params.dataIndex to get the full data item
  const eventItemData = processedData[params.dataIndex];
  if (!eventItemData) {
    return;
  }

  // Get the event start and end timestamps in seconds
  let tmpEventDurationInSeconds = eventItemData.eventDurationInSeconds;
  // Get the corresponding yAxisIndexes from the matchedHourlyIntervals the event belongs to
  const yAxisIndexes = eventItemData.matchedHourlyIntervals;
  const tmpStartDate = new Date(eventItemData.value[0])
  const tmpEventStartMinute = new Intl.DateTimeFormat(tmpLocaleOption, {
    minute: "2-digit",
  }).format(tmpStartDate);
  let tmpEventStartPoint = tmpEventStartMinute * 60;
  let tmpMaximumInitialDrawingSpace = 3600 - (tmpEventStartMinute * 60);
  let yAxisDownIterator = 0;
  let rectangleDrawingsArray = [];
  while (tmpEventDurationInSeconds > 0) {
    // Get the start point for drawing the rectangles
    // Use api.coord to get the pixel coordinates for the rectangle.
    const pointStart = api.coord([tmpEventStartPoint, yAxisIndexes[yAxisDownIterator]]);
    const pointEnd = api.coord([tmpEventStartPoint + tmpMaximumInitialDrawingSpace, yAxisIndexes[yAxisDownIterator]]);
    const rectShape = {
      x: pointStart[0],
      y: pointStart[1] - api.size([0, 1])[1] / 2,
      width: pointEnd[0] - pointStart[0],
      height: api.size([0, 1])[1] * 0.8,
    };
    const rectDrawing = {
      type: 'rect',
      shape: rectShape,
      style: api.style(),
    };
    rectangleDrawingsArray.push(rectDrawing);
    tmpEventStartPoint = 0; // Start from zero on the next row
    tmpEventDurationInSeconds = tmpEventDurationInSeconds - tmpMaximumInitialDrawingSpace;
    tmpMaximumInitialDrawingSpace = tmpEventDurationInSeconds;
    if (tmpMaximumInitialDrawingSpace > 3600) {
      tmpMaximumInitialDrawingSpace = 3600; // Restrict the max nr of drawed seconds per line
    }
    yAxisDownIterator++
  }
  params.context.counter++;
  return {
    type: 'group',
    children: rectangleDrawingsArray,
  };
}

function renderItemLogic(params, api) {
  var categoryIndex = api.value(2);
  var start = api.coord([api.value(0), categoryIndex]);
  var end = api.coord([api.value(1), categoryIndex]);
  var height = api.size([0, 1])[1] * 0.6;
  var rectShape = echarts.graphic.clipRectByRect(
    {
      x: start[0],
      y: start[1] - height / 2,
      width: end[0] - start[0],
      height: height
    },
    {
      x: params.coordSys.x,
      y: params.coordSys.y,
      width: params.coordSys.width,
      height: params.coordSys.height
    }
  );
  return (
    rectShape && {
      type: 'rect',
      transition: ['shape'],
      shape: rectShape,
      style: api.style(),
      styleEmphasis: api.styleEmphasis(),
    }
  );
}

const _buildTimelineOption = function (data, config, tmpChartInstance) {
  reInitializeDataHolders();
  // Start creating the annotated computedOption object that will be passed to echart instance
  let computedOption = {};
  let configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];
  let useSplunkCategoricalColors = config[this.getPropertyNamespaceInfo().propertyNamespace + "useSplunkCategoricalColors"];
  let splitByHour = config[this.getPropertyNamespaceInfo().propertyNamespace + "splitByHour"];

  if (typeof splitByHour !== 'undefined' && splitByHour === 'true') {
    splitByHour = true;
  } else {
    splitByHour = false;
  }

  optionFromXmlDashboard = this._parseOption(configOption);
  const _setCustomTokens = this._setCustomTokens;
  const _setSplunkMessages = this._setSplunkMessages;

  // Extract 
  let computedDimensions = data.fields.map(tmpField => tmpField.name);
  let allSeriesData = [];
  let deselectedLegends = []; // Array to track deselected legends
  let originalDataHasBeenCopied = false;
  let nrOfDataFieldsToBeCheckedFor = 4; // Minimum nr of fields required for this visualization to work in case the user is choosing to use splunk categorical colors
  let configColorDataIndexBinding;

  if (useSplunkCategoricalColors.toLowerCase() !== 'true') {
    nrOfDataFieldsToBeCheckedFor = 5; // Minimum nr of fields required for this visualization to work in case the user is choosing to use its own colors
    configColorDataIndexBinding = 4;
    const dataRowsIsValidColor = this._sharedFunctions.isColorCode(data.rows[0][4]);
    if (!dataRowsIsValidColor) {
      console.log(`The 5th data field is not a valid color code! It is going to be prefilled with a splunk categorical color.`);
    }
  }

  // Dynamic data field length check
  if (typeof data.fields === 'undefined' || data.fields.length < nrOfDataFieldsToBeCheckedFor) {
    throw `Error: This visualization needs at least ${nrOfDataFieldsToBeCheckedFor} different fields (start_time, end_time, internal_name, category, ${nrOfDataFieldsToBeCheckedFor === 5 ? 'fill_color' : ''})! Please check the query results!`
  }

  if(data.rows.length > 50000) {
    _setSplunkMessages("info", "The visualization displays only 50000 rows from the current search result!");
    data.rows = data.rows.slice(0, 50000); //keep only the first 50,000 items from data.rows
  }

  // Read start_time from data.fields[0]
  let configStartTimeDataIndexBinding = 0;

  // Read the end_time from data.fields[1]
  let configEndTimeDataIndexBinding = 1;

  // Read the series name from data.fields[2]
  let configSeriesDataIndexBinding = 2;

  // Read the legends name from data.fields[3]
  let configLegendsDataIndexBinding = 3;

  // Before doing any processing ignore any rows that have any of the start_time, end_time, internal_name or category properties empty
  // The data.rows array contains sub-arrays, each with at least four elements (representing start_time, end_time, internal_name, and category)
  // For each sub-array (row), we use slice(0, 4) to consider only the first four elements.
  // The every() method ensures all four elements are not "", null, or undefined.
  let cleanDataRows = data.rows.filter(row =>
    row.slice(0, 4).every(value =>
      value !== "" && value !== null && value !== undefined
    )
  );

  if (useSplunkCategoricalColors.toLowerCase() === 'true') {
    // Get all unique categories from cleanDataRows
    const uniqueCategories = [...new Set(cleanDataRows.map(dataRow => dataRow[3]))];
    // Generate color palette based on number of unique categories
    const colorPalette = this._sharedFunctions.generateColorPalette(uniqueCategories.length);
    // Map categories to colors
    const categoryColors = uniqueCategories.reduce((acc, category, index) => {
      acc[category] = colorPalette[index];
      return acc;
    }, {});
    // Push the dynamicFillColor to every sub-array from cleanDataRows based on category
    const enhancedRowsWithColorPalette = cleanDataRows.map(dataRow => [
      ...dataRow,
      categoryColors[dataRow[3]] || "#999999" // Append color, use fallback if category not found
    ]);
    cleanDataRows = enhancedRowsWithColorPalette;
    computedDimensions.push('dynamicFillColor');
    // Overwrite configColorDataIndexBinding with the index of the dynamicFillColor property
    configColorDataIndexBinding = cleanDataRows[0].length - 1;
  } else {
    // Identify all unique rows that at least one empty value in the fill_color property.
    // Then, sets the value of fill_color to a color from splunk color palette for all rows belonging to the same category.

    // Step 1: Identify all unique rows that have at least one empty fill_color value
    const categoriesWithEmptyColorColumnValues = new Set();
    cleanDataRows.forEach((rowSubArray) => {
      if (!rowSubArray[configColorDataIndexBinding] || rowSubArray[configColorDataIndexBinding] == "") {
        categoriesWithEmptyColorColumnValues.add(rowSubArray[configLegendsDataIndexBinding]);
      }
    });

    // Generate color palette based on number of unique categories with at least 1 empty color value
    const colorPalette = this._sharedFunctions.generateColorPalette(categoriesWithEmptyColorColumnValues.size);

    // Convert the keys to an array so we can find the index when adding the color from the colorPalette
    const tmpKeysArray = Array.from(categoriesWithEmptyColorColumnValues);

    // Step 2: Assign the splunk colors to all data rows where category is in categoriesWithEmptyColorColumnValues
    cleanDataRows.forEach((rowSubArray) => {
      if (categoriesWithEmptyColorColumnValues.has(rowSubArray[configLegendsDataIndexBinding])) {
        const matchedValue = rowSubArray[configLegendsDataIndexBinding];
        const indexInKeysToModify = tmpKeysArray.findIndex(key => key === matchedValue);
        rowSubArray[configColorDataIndexBinding] = colorPalette[indexInKeysToModify];
      }
    });
  }

  // Create the legends
  cleanDataRows.forEach((tmpRow) => {
    const tmpValue = tmpRow[configSeriesDataIndexBinding];
    const tmpLegendValue = tmpRow[configLegendsDataIndexBinding];
    const tmpColorValue = tmpRow[configColorDataIndexBinding];
    if (!processedCategories.includes(tmpValue)) {
      processedCategories.push(tmpValue);
    }
    if (!lodashFind(processedLegends, { 'name': tmpLegendValue })) {
      // processedLegends is used for adding the series line items to echart option.series array
      // the name and fillColor are mandatory
      processedLegends.push({
        type: "text",
        name: tmpLegendValue,
        fillColor: tmpColorValue,
      });

      manuallyAddedLegends.push({
        name: tmpLegendValue,
        icon: 'rect',
        textStyle: {
          color: genericTextColor,
          fontFamily: "Splunk Platform Sans",
        }
      });
      manuallySelectedLegends[tmpLegendValue] = true;
    }
  });

  // Sort categories as strings in alphabetical and ascending order
  processedCategories = processedCategories.sort().reverse();

  if (splitByHour) {
    // Check if search time boundraries are inside the search results
    if (typeof this.scopedVariables['timeRange'] === 'undefined' || this.scopedVariables['timeRange']['earliest'] === '' || this.scopedVariables['timeRange']['latest'] === '') {
      _setSplunkMessages("error", "The search results do not have time boundraries. Update the query with | addinfo");
      throw "The search results do not have time boundraries. Update the query with | addinfo";
    }

    let rawEventsStartTime = this.scopedVariables['timeRange']['earliest'];
    let rawEventsEndTime = this.scopedVariables['timeRange']['latest'];
    
    hourlyIntervals = [];
    yAxisListedHours = this._sharedFunctions.getHourlyIntervals(rawEventsStartTime, rawEventsEndTime);
    if(yAxisListedHours.length > 25) {
      _setSplunkMessages("error", "The time range too large. This visualization is adapted only for maximum 24 hourly intervals. The rest of the data has been trimmed. Try removing splitByHour parameter?");
    }
    let tmpIdCounter = 0;

    // Ensure we go from smaller to larger timestamp
    const oneHourInMs = 60 * 60 * 1000; // 3600000 milliseconds in an hour
    const minTime = Math.min(rawEventsStartTime, rawEventsEndTime);
    const maxTime = Math.max(rawEventsStartTime, rawEventsEndTime);
    // Round down to the nearest hour
    const minTimeRounded = Math.floor(minTime / oneHourInMs) * oneHourInMs;

    // Step through in hourly increments
    for (let t = minTimeRounded; t < maxTime; t += oneHourInMs) {
      const tmpDate = new Date(t);
      const startTimeString = new Intl.DateTimeFormat(tmpLocaleOption, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(tmpDate);
      // Keep hourlyIntervals saved for drawing the rectangles in render item function
      hourlyIntervals.push({
        id: tmpIdCounter,
        start: t,
        startHour: startTimeString,
        end: Math.min(t + oneHourInMs, maxTime),
      });
      tmpIdCounter++
    }
  }

  // Create processedData, meaning the data array that belongs to first series object (the one with id "timelineData" )
  cleanDataRows.forEach((tmpRow) => {
    const tmpStartTime = tmpRow[configStartTimeDataIndexBinding]; //0
    const tmpEndTime = tmpRow[configEndTimeDataIndexBinding]; //1
    const tmpInternalName = tmpRow[configSeriesDataIndexBinding]; //2
    const tmpReason = tmpRow[configLegendsDataIndexBinding]; //3
    const tmpColor = tmpRow[configColorDataIndexBinding]; //4

    if (!this._sharedFunctions.isValidUnixTimestamp(tmpStartTime)) {
      throw "Error: First value from the data is not a valid unix timestamp! Please check the data!"
    }

    if (!this._sharedFunctions.isValidUnixTimestamp(tmpEndTime)) {
      throw "Error: Second value from the data is not a valid unix timestamp! Please check the data!"
    }

    const tmpDuration = tmpEndTime - tmpStartTime;
    const tmpProcessedInternalNameIdx = processedCategories.findIndex((internalCategoryName) => {
      let tmpResult = false;
      if (internalCategoryName == tmpInternalName) {
        tmpResult = true;
      }
      return tmpResult;
    });
    if (tmpProcessedInternalNameIdx < 0) {
      throw 'Error: The search result has malformed internal_name field mapping';
    }
    if (xAxisDataMinValue === '') {
      xAxisDataMinValue = tmpStartTime;
    } else {
      if (tmpStartTime < xAxisDataMinValue) {
        xAxisDataMinValue = tmpStartTime;
      }
    }
    if (xAxisDataMaxValue === '') {
      xAxisDataMaxValue = tmpEndTime;
    } else {
      if (tmpEndTime > xAxisDataMaxValue) {
        xAxisDataMaxValue = tmpEndTime;
      }
    }
    xAxisStartDates.push(tmpEndTime);
    let dynamicValue = tmpRow;
    dynamicValue[configStartTimeDataIndexBinding] = parseFloat(tmpStartTime * 1000);//start_time (javascript timestamp in miliseconds)
    dynamicValue[configEndTimeDataIndexBinding] = parseFloat(tmpEndTime * 1000);//end_time (javascript timestamp in miliseconds)
    dynamicValue.push(tmpDuration); //duration
    dynamicValue.push(tmpProcessedInternalNameIdx); //legend index,
    dynamicValue.push(tmpStartTime); //unix_start_time (unix timestamp in seconds)
    dynamicValue.push(tmpEndTime); //unix_end_time (unix timestamp in seconds)
    let tmpMatchedHourlyIntervals = [];
    hourlyIntervals.forEach(interval => {
      if ((tmpEndTime * 1000) > interval.start && (tmpStartTime * 1000) < interval.end) {
        // Check if event overlaps interval
        tmpMatchedHourlyIntervals.push(interval.id);
      }
    });
    let customDataObj = {
      name: tmpReason,
      value: dynamicValue,
      itemStyle: {
        color: tmpColor,
      },
      eventDurationInSeconds: tmpDuration,
      matchedHourlyIntervals: tmpMatchedHourlyIntervals,
      utilityFunctions: {
        displayDate: this._sharedFunctions.extractDate,
        displayTime: this._sharedFunctions.extractTime,
        escapeHtml: this._sharedFunctions.escapeHtml,
      }
    };
    processedData.push(customDataObj);
  });

  computedDimensions.push('duration');
  computedDimensions.push('legend_index');
  computedDimensions.push('unix_start_time');
  computedDimensions.push('unix_end_time');

  if (optionFromXmlDashboard == null) {
    return null;
  }

  // Ensure grid property overwrite
  if (!optionFromXmlDashboard.grid) {
    // Apply default setting for echart option.grid
    computedOption.grid = {
      height: splitByHour ? (35 * yAxisListedHours.length) : 300,
      left: '5%',
      top: 80,
      containLabel: true,
    };
  }

  // Ensure xAxis property overwrite
  if (!optionFromXmlDashboard.xAxis && !splitByHour) {
    // Apply default setting for echart option.xAxis
    computedOption.xAxis = [
      {
        type: "time",
        boundaryGap: false,
        axisLabel: {
          color: genericTextColor,
          fontFamily: "Splunk Platform Sans",
          fontSize: 14,
          formatter: {
            year: '{yyyy}',
            month: '{MMM}',
            day: '{dayStyle|{d} {MMM}}',
            hour: '{HH}:{mm}',
            minute: '{HH}:{mm}',
          },
          rich: {
            yearStyle: {
              color: genericTextColor,
              fontWeight: 'bold'
            },
            monthStyle: {
              color: genericTextColor,
            },
            dayStyle: {
              fontWeight: 'bold',
              color: genericTextColor,
            }
          }
        }
      }
    ];
  } else if (!optionFromXmlDashboard.xAxis && splitByHour) {
    console.log('Configure the xAxis for the timeline by hour');
    computedOption.xAxis = {
      type: 'value',
      min: 0,
      max: 3600,
      interval: 600, // Force ticks at intervals of 600 seconds (10 minutes)
      axisTick: {
        interval: 0, // Show ticks at every interval (0, 600, 1200, 1800, 2400, 3000, 3600)
        alignWithLabel: true // Align ticks with labels
      },
      name: 'Time in an Hour (Minutes)',
      nameLocation: 'middle',
      nameGap: 25,
      axisLabel: {
        formatter: function (value) {
          const minutes = Math.floor(value / 60);
          return minutes < 10 ? `0${minutes}:00` : `${minutes}:00`;
        }
      }
    };
  }

  // Ensure yAxis property overwrite
  if (!optionFromXmlDashboard.yAxis) {
    // Apply default setting for echart option.yAxis
    computedOption.yAxis = {
      type: 'category',
      axisTick: {
        show: true
      },
      data: splitByHour ? yAxisListedHours : processedCategories
    };
  } else {
    // Using spread operator to insert data property inside computedOption.yAxis
    computedOption.yAxis = { ...optionFromXmlDashboard.yAxis, data: splitByHour ? yAxisListedHours : processedCategories };
  }

  // Ensure dataZoom property overwrite
  if (!optionFromXmlDashboard.dataZoom && !splitByHour) {
    // Apply default setting for echart option.dataZoom, but only when splitByHour is not active
    computedOption.dataZoom = [
      {
        type: 'slider',
        start: 0,
        end: 100,
        labelFormatter: function (value) {
          return new Date(value).toLocaleTimeString([tmpLocaleOption], { year: 'numeric', month: 'numeric', day: 'numeric', hour: "2-digit", minute: "2-digit" })
        }
      },
      {
        type: 'inside',
        start: 50,
        end: 70
      }
    ];
  }

  //These 2 keys (computedOption.series and computedOption.legend) cannot be overwritten from dashboard source code
  computedOption.series = [{
    id: 'timelineData',
    type: 'custom',
    renderItem: splitByHour ? renderItemForHour : renderItemLogic,
    encode: {
      x: [computedDimensions[configStartTimeDataIndexBinding], computedDimensions[configEndTimeDataIndexBinding]], //start_time, end_time
      y: computedDimensions[configLegendsDataIndexBinding], //category
    },
    selectedMode: 'series',
    dimensions: computedDimensions,
    data: processedData,
  }];

  if (optionFromXmlDashboard.series && optionFromXmlDashboard.series[0]) {
    // Update the first item (id: timelineData) of the series array with properties from optionFromXmlDashboard
    computedOption.series[0] = {
      ...computedOption.series[0], // Keep existing properties of computedOption.series[0]
      ...optionFromXmlDashboard.series[0] // Override with properties from optionFromXmlDashboard.series[0]
    };
  }

  processedLegends.forEach((el) => {
    computedOption.series.push({
      type: 'line',
      name: el.name,
      itemStyle: {
        color: el.fillColor
      },
      data: [],
    });
  })

  computedOption.legend = {
    selected: manuallySelectedLegends,
    data: manuallyAddedLegends,
  };

  if (!optionFromXmlDashboard.legend) {
    computedOption.legend = {
      ...computedOption.legend,
      textStyle: {
        color: genericTextColor,
        fontSize: 13,
      },
      top: 30
    }
  } else {
    // Merge properties from optionFromXmlDashboard.legend into computedOption.legend

    // List of properties to replace in each object of the computedOption.legend.data array.
    // You can add or remove property names here to control which properties get updated.
    // Consult this list regularly depending on the eCharts version
    const overrideableLegendProperties = [
      "icon",
      "itemStyle",
      "lineStyle",
      "inactiveColor",
      "inactiveBorderColor",
      "symbolRotate",
      "textStyle"
    ];

    // Apply the function to computedOption.legend.data using optionFromXmlDashboard.legend as the template
    this._sharedFunctions.replacePropertiesFromTemplate(computedOption.legend.data, optionFromXmlDashboard.legend, overrideableLegendProperties);

    computedOption.legend = {
      ...computedOption.legend,
      ...optionFromXmlDashboard.legend
    };
  }

  tmpChartInstance.on('highlight', function (params) {
    const highlightedName = params.seriesName;
    if (deselectedLegends.includes(highlightedName)) {
      // Do not highligh any data items of this legend if the legend is deselected
      return;
    }

    const tmpXoption = tmpChartInstance.getOption();
    const tmpXseriesData = tmpXoption.series[0].data;
    // Find all indices with matching names
    const indicesToHighlight = [];
    tmpXseriesData.forEach((item, index) => {
      if (item.name !== highlightedName) {
        indicesToHighlight.push(index);
      }
    });
    // Apply opacity only to matching indices
    const rowsOfDataFromSelectedLegends = tmpXseriesData.map((item, index) => {
      if (indicesToHighlight.includes(index)) {
        return {
          ...item,
          itemStyle: {
            ...item.itemStyle,
            opacity: 0 // Make matching items transparent
          }
        };
      }
      return item;
    });
    tmpChartInstance.setOption({
      series: [
        {
          id: 'timelineData',
          data: rowsOfDataFromSelectedLegends
        }
      ]
    }, {
      notMerge: false, // Merges only the data property of the first item from series array with the existing echart options
    });

  });

  tmpChartInstance.on('downplay', function (params) {
    const highlightedName = params.seriesName;
    if (deselectedLegends.includes(highlightedName)) {
      // Do not downplay any data items of this legend if the legend is deselected
      return;
    }

    const tmpXoption = tmpChartInstance.getOption();
    const tmpXseriesData = tmpXoption.series[0].data;
    const rowsOfDataFromSelectedLegends = tmpXseriesData.map(item => ({
      ...item,
      itemStyle: {
        ...item.itemStyle,
        opacity: 1
      }
    }));
    tmpChartInstance.setOption({
      series: [
        {
          id: 'timelineData',
          data: rowsOfDataFromSelectedLegends
        }
      ]
    }, {
      notMerge: false, // Merges only the data property of the first item from series array with the existing echart options
    });
  });

  // Shallow copy of computedOption.series[0].data in allSeriesData with no reference to original computedOption.series[0].data;
  if (!originalDataHasBeenCopied) {
    allSeriesData = computedOption.series[0].data;
    originalDataHasBeenCopied = true;
  }

  tmpChartInstance.on('legendselectchanged', function (params) {
    const legendName = params.name;
    const isSelected = params.selected[legendName];
    if (isSelected) {
      const index = deselectedLegends.indexOf(legendName);
      if (index !== -1) {
        deselectedLegends.splice(index, 1);
      }
    } else {
      deselectedLegends.push(legendName);
    }
    const rowsOfDataFromSelectedLegends = allSeriesData.filter(dataRow => {
      if (deselectedLegends.includes(dataRow.name)) {
        return false;
      }
      return true;
    });
    tmpChartInstance.setOption({
      series: [
        {
          id: 'timelineData',
          data: rowsOfDataFromSelectedLegends
        }
      ]
    }, {
      notMerge: false // Merges only the data property of the first item from series array with the existing echart options
    });
  });

  // After clicking an ECharts custom visualisation rectangle (from timeline) the tokens will be populated, and Splunk will either run the linked search or navigate to another dashboard depending on the xml dashboard definition.
  tmpChartInstance.on('click', 'series', function (params) {
    const shlOptionTmp = tmpChartInstance.getOption();
    if (shlOptionTmp.legend[0].selected[params.name]) {
      _setCustomTokens(params, tmpChartInstance);
    }
  });

  // Overwrite the option keys with values from the xml dashboard
  for (var tmpOptionKey in optionFromXmlDashboard) {
    // Check if the tmpOptionKey is not 'yAxis' or 'series' or 'legend' and if optionFromXmlDashboard has the tmpOptionKey
    if (tmpOptionKey !== 'yAxis' && tmpOptionKey !== 'series' && tmpOptionKey !== 'legend' && Object.prototype.hasOwnProperty.call(optionFromXmlDashboard, tmpOptionKey)) {
      // Replace the value in option with the value from optionFromXmlDashboard
      computedOption[tmpOptionKey] = optionFromXmlDashboard[tmpOptionKey];
    }
  }
  return computedOption;
}

module.exports = _buildTimelineOption;