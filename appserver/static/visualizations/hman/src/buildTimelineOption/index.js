/**
 *  Method to map the search data from Splunk to the eChart instance for 'custom' timeline charts. 
 * 
*/

const SplunkVisualizationUtils = require('api/SplunkVisualizationUtils');
// eslint-disable-next-line
const echarts = require('echarts');
const lodashFind = require('lodash.find');

let processedData = [];
let configOption = {};
let optionFromXmlDashboard = {};
let processedLegends = [];
let manuallyAddedLegends = [];
let manuallySelectedLegends = {};
let startPositionLeft = 0;
var processedCategories = [];
let tmpMappedSeries = [];
let tmpMappedAllRectangles = [];
let tmpOnlySelectedRectangles = [];
let tmpLocale = 'en-GB';
let xAxisDataMinValue = '';
let xAxisDataMaxValue = '';
let xAxisStartDates = [];
const currentTheme = SplunkVisualizationUtils.getCurrentTheme();
const genericTextColor = currentTheme === 'dark' ? '#fff' : '#000';
if (typeof window._i18n_locale !== 'undefined' && typeof window._i18n_locale.locale_name !== 'undefined') {
    tmpLocale = window._i18n_locale.locale_name.replace('_', '-');
}

function renderItem(params, api) {
    var categoryIndex = api.value(3);
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

function showHoveredLegend(tmpChartInstance, params) {
    const shlOption = tmpChartInstance.getOption();
    let shlMappedAllRectangles = [];
    let shlVisibleLegends = [];
    let shlMappedSeries = [];
    let shlOnlySelectedRectangles = [];
    if (typeof shlOption.yAxis !== 'undefined' && typeof shlOption.yAxis[0] !== 'undefined') {
        shlOption.yAxis[0].data.forEach((el, idx) => {
            shlMappedSeries.push(idx)
        })
    }
    if (typeof shlOption.legend !== 'undefined' && typeof shlOption.legend[0].selected !== 'undefined') {
        Object.keys(shlOption.legend[0].selected).forEach((elm) => {
            if (!shlVisibleLegends.includes(elm) && shlOption.legend[0].selected[elm] == true) {
                shlVisibleLegends.push(elm);
            }
        })
    }

    if (typeof shlOption.series !== 'undefined' && typeof shlOption.series[0] !== 'undefined' && typeof shlOption.series[0].data !== 'undefined') {
        shlOption.series[0].data.forEach((el, idx) => {
            shlMappedAllRectangles.push(idx)
            if (el.name == params.seriesName) {
                shlOnlySelectedRectangles.push(idx)
            }
        })
    }
    if (typeof shlOption.series !== 'undefined' && typeof shlOption.series[0] !== 'undefined' && typeof shlOption.series[0].data !== 'undefined') {
        shlOption.series[0].data.forEach((el) => {
            if (params.type == 'highlight') {
                if (el.name != params.seriesName) {
                    el.itemStyle.opacity = 0.06;
                    if (
                        optionFromXmlDashboard?.tooltip && // Check if tooltip exists
                        (optionFromXmlDashboard.tooltip.show === undefined || // No show property
                            optionFromXmlDashboard.tooltip.show !== false) // show is not false
                    ) {
                        el.tooltip = {show:false};
                    }
                } else {
                    el.itemStyle.opacity = 1;
                    if (
                        optionFromXmlDashboard?.tooltip && // Check if tooltip exists
                        (optionFromXmlDashboard.tooltip.show === undefined || // No show property
                            optionFromXmlDashboard.tooltip.show !== false) // show is not false
                    ) {
                        el.tooltip = {show:true};
                    }
                }
            }
            if (params.type == 'downplay') {
                if (shlVisibleLegends.includes(el.name)) {
                    el.itemStyle.opacity = 1;
                    if (
                        optionFromXmlDashboard?.tooltip && // Check if tooltip exists
                        (optionFromXmlDashboard.tooltip.show === undefined || // No show property
                            optionFromXmlDashboard.tooltip.show !== false) // show is not false
                    ) {
                        el.tooltip = {show:true};
                    }
                } else {
                    el.itemStyle.opacity = 0.06;
                    if (
                        optionFromXmlDashboard?.tooltip && // Check if tooltip exists
                        (optionFromXmlDashboard.tooltip.show === undefined || // No show property
                            optionFromXmlDashboard.tooltip.show !== false) // show is not false
                    ) {
                        el.tooltip = {show:false};
                    }
                }
            }
        })
    }
    tmpChartInstance.setOption(shlOption);
}

const _buildTimelineOption = function (data, config, tmpChartInstance) {
    const _setCustomTokens = this._setCustomTokens;
    configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];
    optionFromXmlDashboard = this._parseOption(configOption);
    if (typeof data.fields === 'undefined' || data.fields.length < 5) {
        throw "Error: This visualization needs at least 5 different fields (start_time, end_time, internal_name, category, fill_color)! Please check the query results!"
    }

    // Read start_time from data.fields[0]
    let configStartTimeDataIndexBinding = 0;

    // Read the end_time from data.fields[1]
    let configEndTimeDataIndexBinding = 1;

    // Read the series name from data.fields[2]
    let configSeriesDataIndexBinding = 2;

    // Read the legends name from data.fields[3]
    let configLegendsDataIndexBinding = 3;

    // Read the fill_color from data.fields[4]
    let configColorDataIndexBinding = 4;

    data.rows.forEach((tmpRow) => {
        const tmpValue = tmpRow[configSeriesDataIndexBinding];
        const tmpLegendValue = tmpRow[configLegendsDataIndexBinding];
        const tmpColorValue = tmpRow[configColorDataIndexBinding];
        if (!processedCategories.includes(tmpValue)) {
            processedCategories.push(tmpValue);
        }
        if (!lodashFind(processedLegends, { 'name': tmpLegendValue })) {
            processedLegends.push(
                {
                    type: "text",
                    name: tmpLegendValue,
                    info: tmpLegendValue,
                    onclick: function () {
                        tmpChartInstance.dispatchAction({
                            type: 'highlight',
                            seriesIndex: tmpMappedSeries,
                            dataIndex: tmpMappedAllRectangles
                        });
                    },
                    onmouseover: function (mouseEvt) {
                        const theOriginalOptions = tmpChartInstance.getOption();
                        theOriginalOptions.yAxis[0].data.forEach((el, idx) => {
                            tmpMappedSeries.push(idx)
                        })
                        theOriginalOptions.series[0].data.forEach((el, idx) => {
                            tmpMappedAllRectangles.push(idx);
                            if (el.name == mouseEvt.target.style.text) {
                                tmpOnlySelectedRectangles.push(idx)
                            }
                        })
                        tmpChartInstance.dispatchAction({
                            type: 'highlight',
                            seriesIndex: tmpMappedSeries,
                            dataIndex: tmpMappedAllRectangles
                        });
                        tmpChartInstance.dispatchAction({
                            type: 'downplay',
                            seriesIndex: tmpMappedSeries,
                            dataIndex: tmpOnlySelectedRectangles
                        });
                        tmpOnlySelectedRectangles = [];
                    },
                    onmouseout: function () {
                        tmpChartInstance.dispatchAction({
                            type: 'downplay',
                            seriesIndex: tmpMappedSeries,
                            dataIndex: tmpMappedAllRectangles
                        });
                    },
                    textConfig: {
                        position: 'insideTopLeft',
                        layoutRect: {
                            width: 20,
                        },
                    },
                    style: {
                        text: tmpLegendValue,
                        fontSize: 12,
                        fontFamily: "Splunk Platform Sans",
                        fill: tmpColorValue,
                        x: startPositionLeft,
                    },
                    z: 100
                }
            );
            manuallyAddedLegends.push({
                name: tmpLegendValue,
                icon: 'rect',
                textStyle: {
                    width: 100,
                    color: genericTextColor,
                }
            });
            manuallySelectedLegends[tmpLegendValue] = true;
            startPositionLeft += 110;
        }
    });

    // Sort categories as strings in alphabetical and ascending order
    processedCategories = processedCategories.sort().reverse();

    data.rows.forEach((tmpRow) => {
        const tmpInternalName = tmpRow[configSeriesDataIndexBinding];
        const tmpReason = tmpRow[configLegendsDataIndexBinding];
        const tmpColor = tmpRow[configColorDataIndexBinding];
        const tmpStartTime = tmpRow[configStartTimeDataIndexBinding];
        const tmpEndTime = tmpRow[configEndTimeDataIndexBinding];
        if (!this._sharedFunctions.isValidUnixTimestamp(tmpStartTime)) {
            throw "Error: First value from the data is not a valid unix timestamp! Please check the data!"
        }
        if (!this._sharedFunctions.isValidUnixTimestamp(tmpEndTime)) {
            throw "Error: Second value from the data is not a valid unix timestamp! Please check the data!"
        }
        const tmpDuration = tmpEndTime - tmpStartTime;
        let tmpCategoryName = '';
        const tmpProcessedInternalNameIdx = processedCategories.findIndex((internalCategoryName) => {
            let tmpResult = false;
            if (internalCategoryName == tmpInternalName) {
                tmpCategoryName = internalCategoryName;
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
        let dynamicValue = [
            parseFloat(tmpStartTime * 1000), //start_time (javascript timestamp in miliseconds)
            parseFloat(tmpEndTime * 1000), //end_time (javascript timestamp in miliseconds)
            tmpDuration, //duration
            tmpCategoryName, //category_name
            tmpReason, //legend_name
            tmpColor, //color
            tmpProcessedInternalNameIdx, //legend index,
            tmpStartTime, //unix_start_time (unix timestamp in seconds)
            tmpEndTime, //unix_end_time (unix timestamp in seconds)
        ];
        let customDataObj = {
            name: tmpReason,
            value: dynamicValue,
            itemStyle: {
                color: tmpColor,
            },
            utilityFunctions: {
                displayDate: this._sharedFunctions.extractDate,
                displayTime: this._sharedFunctions.extractTime,
                escapeHtml: this._sharedFunctions.escapeHtml,
            }
        };
        processedData.push(customDataObj);
    });

    let option = {};
    if (optionFromXmlDashboard == null) {
        return null;
    }
    option.grid = {
        height: 300,
        left: '5%',
        top: 80,
        containLabel: true,
    };
    option.xAxis = [
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
    option.yAxis = {
        data: processedCategories
    };
    option.dataZoom = [
        {
            type: 'slider',
            start: 0,
            end: 100,
            labelFormatter: function (value) {
                return new Date(value).toLocaleTimeString([tmpLocale], { year: 'numeric', month: 'numeric', day: 'numeric', hour: "2-digit", minute: "2-digit" })
            }
        },
        {
            type: 'inside',
            start: 50,
            end: 70
        }
    ];
    //These 2 keys (option.series and option.legend) cannot be overwritten from dashboard source code
    option.series = [{
        type: 'custom',
        renderItem: renderItem,
        encode: {
            x: 'start_time',
            y: 'category'
        },
        selectedMode: 'series',
        dimensions: ['start_time', 'end_time', 'duration', 'category_name', 'legend_name', 'color', 'legend_idx', 'unix_start_time', 'unix_end_time'],
        data: processedData,
        emphasis: {
            itemStyle: {
                opacity: '0',
            }
        }
    }];
    processedLegends.forEach((el) => {
        option.series.push({
            type: 'line',
            name: el.name,
            itemStyle: {
                color: el.style.fill,
            },
            data: [],
        });
    })
    option.legend = {
        textStyle: {
            color: genericTextColor,
            fontSize: 13,
        },
        top: 30,
        selected: manuallySelectedLegends,
        data: manuallyAddedLegends,
    }
    tmpChartInstance.on('highlight', function (params) {
        if (typeof params.seriesName !== 'undefined') {
            showHoveredLegend(tmpChartInstance, params);
        }
    });
    tmpChartInstance.on('downplay', function (params) {
        if (typeof params.seriesName !== 'undefined') {
            showHoveredLegend(tmpChartInstance, params);
        }
    });
    tmpChartInstance.on('legendselectchanged', function (params) {
        console.log('legendselectchanged', params);
    });

    // After clicking an ECharts custom visualisation rectangle (from timeline) the tokens will be populated, and Splunk will either run the linked search or navigate to another dashboard depending on the xml dashboard definition.
    tmpChartInstance.on('click', 'series', function (params) {
        const shlOption = tmpChartInstance.getOption();
        if (shlOption.legend[0].selected[params.name]) {
            _setCustomTokens(params, tmpChartInstance);
        }
    });

    // Overwrite the option keys with values from the xml dashboard
    for (var tmpOptionKey in optionFromXmlDashboard) {
        // Check if the tmpOptionKey is not 'yAxis' or 'series' or 'legend' and if optionFromXmlDashboard has the tmpOptionKey
        if (tmpOptionKey !== 'yAxis' && tmpOptionKey !== 'series' && tmpOptionKey !== 'legend' && Object.prototype.hasOwnProperty.call(optionFromXmlDashboard, tmpOptionKey)) {
            // Replace the value in option with the value from optionFromXmlDashboard
            option[tmpOptionKey] = optionFromXmlDashboard[tmpOptionKey];
        }
    }
    return option;
}

module.exports = _buildTimelineOption;