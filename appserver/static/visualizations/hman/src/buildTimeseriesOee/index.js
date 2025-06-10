/**
 *  Method to map the search data from Splunk to the eChart instance for 'custom' charts. 
 * 
*/

// eslint-disable-next-line
const echarts = require('echarts');
const lodashFind = require('lodash.find');

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
if(typeof window._i18n_locale !== 'undefined' && typeof window._i18n_locale.locale_name !== 'undefined') {
    tmpLocale = window._i18n_locale.locale_name.replace('_', '-');
}

function renderItem(params, api) {
    var categoryIndex = api.value(0);
    var start = api.coord([api.value(1), categoryIndex]);
    var end = api.coord([api.value(2), categoryIndex]);
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

    // Check for internalName field -> This field will provide the categories array
    const isInternalNameField = (element) => element.name == 'internal_name';
    const isReasonField = (element) => element.name == 'category';
    const isColorField = (element) => element.name == 'fill_color';
    const isStartTimeField = (element) => element.name == 'start_time';
    const isEndTimeField = (element) => element.name == 'end_time';

    const internalNameIdx = data.fields.findIndex(isInternalNameField);
    const reasonIdx = data.fields.findIndex(isReasonField);
    const colorIdx = data.fields.findIndex(isColorField);
    const startTimeIdx = data.fields.findIndex(isStartTimeField);
    const endTimeIdx = data.fields.findIndex(isEndTimeField);

    if (internalNameIdx < 0) {
        throw "Error: The search result have no internal_name field inside!"
    }
    if (reasonIdx < 0) {
        throw "Error: The search result have no category field inside!"
    }
    if (colorIdx < 0) {
        throw "Error: The search result have no fill_color field inside!"
    }
    if(startTimeIdx < 0) {
        throw "Error: The search result have no start_time field inside!"
    }
    if(endTimeIdx < 0) {
        throw "Error: The search result have no end_time field inside!"
    }

    
    data.rows.forEach((tmpRow) => {
        const tmpValue = tmpRow[internalNameIdx];
        const tmpLegendValue = tmpRow[reasonIdx];
        const tmpColorValue = tmpRow[colorIdx];
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
        const tmpInternalName = tmpRow[internalNameIdx];
        const tmpReason = tmpRow[reasonIdx];
        const tmpColor = tmpRow[colorIdx];
        const tmpStartTime = tmpRow[startTimeIdx];
        const tmpEndTime = tmpRow[endTimeIdx];
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
        processedData.push({
            name: tmpReason,
            value: [tmpProcessedInternalNameIdx, tmpStartTime, tmpEndTime, tmpDuration],
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
    option.dataZoom = [
        {
            type: 'slider',
            filterMode: 'weakFilter',
            showDataShadow: false,
            top: 400,
            labelFormatter: '',
        },
        {
            type: 'inside',
            filterMode: 'weakFilter',
        }
    ];
    option.grid = {
        height: 300
    };
    option.xAxis = [
        {
            boundaryGap: false,
            axisLine: { onZero: false },
            min: 1727341200,
            scale: true,
            axisLabel: {
                formatter: function (val) {
                    return new Date(val * 1000).toLocaleTimeString([tmpLocale], {year: 'numeric', month: 'numeric', day: 'numeric', hour: "2-digit", minute: "2-digit" })
                }
            }
        },
    ];
    option.yAxis = {
        data: processedCategories
    };
    option.series = [{
        type: 'custom',
        renderItem: renderItem,
        encode: {
            x: [startTimeIdx, endTimeIdx],
            y: internalNameIdx
        },
        selectedMode: 'series',
        //dimensions: [],
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