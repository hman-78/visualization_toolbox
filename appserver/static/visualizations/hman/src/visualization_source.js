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
const _buildTimelineOption = require('./buildTimeline');
const _buildSimpleBoxplotOption = require('./buildSimpleBoxplotOption');
const _createModal = require('./createModal');
const _drilldownToCategories = require('./drilldownToCategories');
const _drilldownToCategory = require('./drilldownToCategory');
const _drilldownToTimeRange = require('./drilldownToTimeRange');
const _drilldownToTimeRangeAndCategory = require('./drilldownToTimeRangeAndCategory');
const _formatData = require('./formatData');
const _getEchartProps = require('./getEchartProps');
const _getInitialDataParams = require('./getInitialDataParams');
const _handleAnnotation = require('./handleAnnotation');
const _initialize = require('./initialize');
const _initializeMQTT = require('./initializeMQTT');
const _parseDynamicIndexInput = require('./parseDynamicIndexInput');
const _parseIndex = require('./parseIndex');
const _parseOption = require('./parseOption');
const _reflow = require('./reflow');
const _selfModifiyingOption = require('./selfModifiyingOption');
const _selfModifiyingOptionWithReturn = require('./selfModifiyingOptionWithReturn');
const _sendMQTTMessage = require('./sendMQTTMessage')
const _setCustomTokens = require('./setCustomTokens')
const _setupView = require('./setupView')
const _sharedFunctions = require('./sharedFunctions')
const _updateView = require('./updateView');
const PrivateVariables = require('./privateVars');

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
		/* eslint-disable */
		SplunkVisualizationUtils,
		echarts,
		mqtt
		/* eslint-enable */
	) {
		const scopedVariables = new PrivateVariables();
		return SplunkVisualizationBase.extend({
			scopedVariables,
			_buildBoxplotOption: _buildBoxplotOption,
			_buildCustomOption: _buildCustomOption,
			_buildTimelineOption: _buildTimelineOption,
			_buildSimpleBoxplotOption: _buildSimpleBoxplotOption,
			createModal: _createModal,
			drilldownToCategories: _drilldownToCategories,
			drilldownToCategory: _drilldownToCategory,
			drilldownToTimeRange: _drilldownToTimeRange,
			drilldownToTimeRangeAndCategory: _drilldownToTimeRangeAndCategory,
			formatData: _formatData, // Interface method available in SplunkVisualizationBase.
			_getEchartProps: _getEchartProps,
			getInitialDataParams: _getInitialDataParams, // Interface method available in SplunkVisualizationBase. Indicates how the visualization framework fetches data for the visualization.
			_handleAnnotation: _handleAnnotation,
			initialize: _initialize, // Interface method available in SplunkVisualizationBase.
			_initializeMQTT: _initializeMQTT,
			_parseDynamicIndexInput: _parseDynamicIndexInput,
			_parseIndex: _parseIndex,
			_parseOption: _parseOption,
			reflow: _reflow, // Interface method available in SplunkVisualizationBase. Implements visualization resizing logic.
			selfModifiyingOption: _selfModifiyingOption,
			selfModifiyingOptionWithReturn: _selfModifiyingOptionWithReturn,
			_setCustomTokens: _setCustomTokens,
			_sendMQTTMessage: _sendMQTTMessage,
			setupView: _setupView,
      _sharedFunctions: _sharedFunctions,
			updateView: _updateView // Interface method available in SplunkVisualizationBase. Function called to render the visualization.
		});
	});