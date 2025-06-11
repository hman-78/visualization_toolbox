/**
 *  Method to map the search data from Splunk to the eChart instance for 'custom' charts. 
 * 
*/

// eslint-disable-next-line
const echarts = require('echarts');
const lodashFind = require('lodash.find');
const isNumber = value => !isNaN(parseFloat(value)) && isFinite(value);

let processedData = [];
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
if(typeof window._i18n_locale !== 'undefined' && typeof window._i18n_locale.locale_name !== 'undefined') {
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
    if(typeof shlOption.yAxis !== 'undefined' && typeof shlOption.yAxis[0] !== 'undefined') {
        shlOption.yAxis[0].data.forEach((el, idx) => {
            shlMappedSeries.push(idx)
        })
    }
    if(typeof shlOption.legend !== 'undefined' && typeof shlOption.legend[0].selected !== 'undefined') {
        Object.keys(shlOption.legend[0].selected).forEach((elm) => {
            if(!shlVisibleLegends.includes(elm) && shlOption.legend[0].selected[elm] == true) {
                shlVisibleLegends.push(elm);
            }
        })
    }

    if(typeof shlOption.series !== 'undefined' && typeof shlOption.series[0] !== 'undefined' && typeof shlOption.series[0].data !== 'undefined') {
        shlOption.series[0].data.forEach((el, idx) => {
            shlMappedAllRectangles.push(idx)
            if(el.name == params.seriesName) {
                shlOnlySelectedRectangles.push(idx)
            }
        })
    }
    if(typeof shlOption.series !== 'undefined' && typeof shlOption.series[0] !== 'undefined' && typeof shlOption.series[0].data !== 'undefined') {
        shlOption.series[0].data.forEach((el) => {
            if(params.type == 'highlight') {
                if(el.name != params.seriesName) {
                    el.itemStyle.opacity = 0;
                } else {
                    el.itemStyle.opacity = 1;
                }
            }
            if(params.type == 'downplay') {
                if(shlVisibleLegends.includes(el.name)) {
                    el.itemStyle.opacity = 1;
                } else {
                    el.itemStyle.opacity = 0;
                }
            }
        })
    }
    tmpChartInstance.setOption(shlOption);
}

const _buildTimeseriesOption = function (data, config, tmpChartInstance) {
    let configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];

    // Check for seriesDataIndexBinding option -> This index nr will provide the categories array
    let configSeriesDataIndexBinding = parseInt(config[this.getPropertyNamespaceInfo().propertyNamespace + "seriesDataIndexBinding"]); //internal_name idx

    // Check for startTimeDataIndexBinding option -> This index nr will provide the start_time column index
    let configStartTimeDataIndexBinding = parseInt(config[this.getPropertyNamespaceInfo().propertyNamespace + "startTimeDataIndexBinding"]); //start_time idx

    // Check for startTimeDataIndexBinding option -> This index nr will provide the end_time column index
    let configEndTimeDataIndexBinding = parseInt(config[this.getPropertyNamespaceInfo().propertyNamespace + "endTimeDataIndexBinding"]); //end_time idx

    // Check for colorDataIndexBinding option -> This index nr will provide the color column index
    let configColorDataIndexBinding = parseInt(config[this.getPropertyNamespaceInfo().propertyNamespace + "colorDataIndexBinding"]); //end_time idx

    // Check for legendsDataIndexBinding option -> This index nr will provide the legends column index
    let configLegendsDataIndexBinding = parseInt(config[this.getPropertyNamespaceInfo().propertyNamespace + "legendsDataIndexBinding"]); //end_time idx

    if(typeof configSeriesDataIndexBinding === 'undefined' || !isNumber(configSeriesDataIndexBinding)) {
        throw "Error: wrong configuration for seriesDataIndexBinding! Please check the dashboard source code!"
    }
    if(typeof configStartTimeDataIndexBinding === 'undefined' || !isNumber(configStartTimeDataIndexBinding)) {
        throw "Error: wrong configuration for configStartTimeDataIndexBinding! Please check the dashboard source code!"
    }
    if(typeof configColorDataIndexBinding === 'undefined' || !isNumber(configColorDataIndexBinding)) {
        throw "Error: wrong configuration for configColorDataIndexBinding! Please check the dashboard source code!"
    }
    if(typeof configEndTimeDataIndexBinding === 'undefined' || !isNumber(configEndTimeDataIndexBinding)) {
        throw "Error: wrong configuration for configEndTimeDataIndexBinding! Please check the dashboard source code!"
    }
    if(typeof configLegendsDataIndexBinding === 'undefined' || !isNumber(configLegendsDataIndexBinding)) {
        throw "Error: wrong configuration for configLegendsDataIndexBinding! Please check the dashboard source code!"
    }
    
    data.rows.forEach((tmpRow) => {
        const tmpValue = tmpRow[configSeriesDataIndexBinding];
        const tmpLegendValue = tmpRow[configLegendsDataIndexBinding];
        const tmpColorValue = tmpRow[configColorDataIndexBinding];
        if(!processedCategories.includes(tmpValue)) {
            processedCategories.push(tmpValue);
        }
        if(!lodashFind(processedLegends, {'name': tmpLegendValue})) {
          processedLegends.push(
            {
              type: "text",
              name: tmpLegendValue,
              info: tmpLegendValue,
              onclick: function() {
                tmpChartInstance.dispatchAction({
                    type: 'highlight',
                    seriesIndex: tmpMappedSeries,
                    dataIndex: tmpMappedAllRectangles
                });
              }, 
              onmouseover: function(mouseEvt) {
                const theOriginalOptions = tmpChartInstance.getOption();
                theOriginalOptions.yAxis[0].data.forEach((el, idx) => {
                    tmpMappedSeries.push(idx)
                })
                theOriginalOptions.series[0].data.forEach((el, idx) => {
                    tmpMappedAllRectangles.push(idx);
                    if(el.name == mouseEvt.target.style.text) {
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
              onmouseout: function() {
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
                overflow: 'truncate',
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
                overflow: 'truncate',
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
        const tmpDuration = tmpEndTime - tmpStartTime;
        const tmpProcessedInternalNameIdx = processedCategories.findIndex((internalCategoryName) => {
            let tmpResult = false;
            if(internalCategoryName == tmpInternalName) {
                tmpResult = true;
            }
            return tmpResult;
        });
        if(tmpProcessedInternalNameIdx < 0) {
            throw 'Error: The search result has malformed internal_name field mapping';
        }
        if(xAxisDataMinValue === '') {
            xAxisDataMinValue = tmpStartTime;
        } else {
            if(tmpStartTime < xAxisDataMinValue) {
                xAxisDataMinValue = tmpStartTime;
            }
        }
        if(xAxisDataMaxValue === '') {
            xAxisDataMaxValue = tmpEndTime;
        } else {
            if(tmpEndTime > xAxisDataMaxValue) {
                xAxisDataMaxValue = tmpEndTime;
            }
        }
        xAxisStartDates.push(tmpEndTime);
        processedData.push({
            name: tmpReason,
            value: [parseFloat(tmpStartTime), parseFloat(tmpEndTime), tmpDuration, tmpProcessedInternalNameIdx],
            itemStyle: {
                color: tmpColor,
            },
            tooltip: {
                backgroundColor: 'blue',
                formatter: function(params) {
                    return `
                        <div style="padding: 10px; background-color: ${params.data.itemStyle.color};">
                            <p><strong>Interval</strong>: ${new Date(params.data.value[1] * 1000).toLocaleTimeString([tmpLocale], { hour: "2-digit", minute: "2-digit" })} - ${new Date(params.data.value[2] * 1000).toLocaleTimeString([tmpLocale], { hour: "2-digit", minute: "2-digit" })}</p>
                            <p><strong>Category</strong>: ${params.data.name}</p>
                        </div>
                    `;
                }
            }
        })
    });

    let option = {};
    option = this._parseOption(configOption);
    if (option == null) {
        return null;
    }
    option.grid = {
        height: 300
    };
    option.xAxis = [
        {
            type: "time",
            boundaryGap: false,
            
        }
    ];
    option.yAxis = {
        data: processedCategories
    };
    option.dataZoom = [
        {
        type: 'slider',
        start: 50,
        end: 70
        },
        {
        type: 'inside',
        start: 50,
        end: 70
        }
    ];
    option.series = [{
        type: 'custom',
        renderItem: renderItem,
        encode: {
            x: 'start_timex',
            y: 'category'
        },
        selectedMode: 'series',
        dimensions: ['start_timex', 'end_time', 'duration', 'category'],
        data: processedData,
        emphasis: {
            itemStyle: {
                //color: 'rgba(255,255,255,0)',
                opacity: '0.25',
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
    /*
    option.graphic = {
        type: 'group',
        top: 40,
        left: 20,
        bounding: 'all',
        children: processedLegends,
    };
    */
    option.legend = {
        type: 'scroll',
        orient: 'horizontal',
        top: 30,
        tooltip: {
            show: true,
        },
        selected: manuallySelectedLegends,
        data: manuallyAddedLegends,
    }
    tmpChartInstance.on('highlight', function(params) {
        if(typeof params.seriesName !== 'undefined') {
            showHoveredLegend(tmpChartInstance, params);
        }        
    });
    tmpChartInstance.on('downplay', function(params) {
        if(typeof params.seriesName !== 'undefined') {
            showHoveredLegend(tmpChartInstance, params);
        }
    });
    tmpChartInstance.on('legendselectchanged', function(params) {
        console.log('legendselectchanged', params);
    });

    return option;
}

module.exports = _buildTimeseriesOption;