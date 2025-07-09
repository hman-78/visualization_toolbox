/*eslint no-unused-vars: "error"*/
/* exported SplunkVisualizationBase */
const SplunkVisualizationBase = require('api/SplunkVisualizationBase');

/**
 * To be called after a timeseries custom render item was clicked upon
*/
const _setCustomTokens = function (params, tmpChartInstance, data) {
    console.log('_setCustomTokens...', params, tmpChartInstance, data, this, SplunkVisualizationBase);
    // Get token models
    var defaultTokenModel = this.splunkjs.mvc.Components.get("default");
    
    // Set tokens for drilldown
    defaultTokenModel.set('hman_ts_series', params.data.value[4]);
    defaultTokenModel.set('hman_ts_legend', params.data.name); // Move this in paramas.data.value array
    defaultTokenModel.set('hman_ts_start_time', params.data.value[0] / 1000); //remove this and apply the timezone only at echarts level
    defaultTokenModel.set('hman_ts_end_time', params.data.value[1] / 1000);
    defaultTokenModel.set('hman_ts_duration', params.data.value[2]);
    defaultTokenModel.set('hman_ts_color', params.data.value[3]);
    //defaultTokenModel.set('hman_ts_col6', params.data.value[6]); //sanitize the name of the aux columns
    //
    const targetUrl = 'http://localhost:8000/en-US/app/visualization_toolbox/echarts_timeseries_datatype';
    const drilldownObj = {
        "hman_ts_series": params.data.value[4],
        "hman_ts_legend": params.data.name
    };

    console.log('SplunkVisualizationBase.FIELD_VALUE_DRILLDOWN');
    //this.splunkjs.mvc.drilldown();
}

module.exports = _setCustomTokens;