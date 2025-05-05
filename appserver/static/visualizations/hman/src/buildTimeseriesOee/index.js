/**
 *  Method to map the search data from Splunk to the eChart instance for 'custom' charts. 
 * 
*/

// eslint-disable-next-line
const echarts = require('echarts');

let processedData = [];
var timestamp = Math.round(new Date().getTime() / 1000);
var startTime24HoursAgo = timestamp - (24 * 3600);
console.log('startTime24HoursAgo', startTime24HoursAgo);
var processedCategories = [];

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
            style: api.style()
        }
    );
}

const _buildTimeseriesOption = function (data, config) {
    console.log('The data of _buildTimeseriesOption', data);
    console.log('Inside _buildTimeseriesOption', config);
    let configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];

    // Read echart properties
    //const echartProps = this._getEchartProps(config);

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
        if(!processedCategories.includes(tmpValue)) {
            processedCategories.push(tmpValue);
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
                normal: {
                    color: tmpColor
                }
            }
        })
    });

    let option = {};
    option = this._parseOption(configOption);
    if (option == null) {
        return null;
    }
    option.xAxis = {
        min: 1727341200,
        scale: true,
        axisLabel: {
            formatter: function (val) {
                return Math.max(0, val - 1727341200) + ' ms';
            }
        }
    };
    option.yAxis = {
        data: processedCategories
    };
    option.series = [{
        type: 'custom',
        renderItem: renderItem,
        itemStyle: {
            opacity: 0.8
        },
        encode: {
            x: [startTimeIdx, endTimeIdx],
            y: internalNameIdx
        },
        data: processedData
    }];
    console.log('Before returning from oee', option);
    return option;
}

module.exports = _buildTimeseriesOption;