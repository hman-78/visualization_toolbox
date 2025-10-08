# buildTimelineOption Reference Documentation

## Overview

The `buildTimelineOption/index.js` module is responsible for building ECharts timeline visualization options for the Splunk visualization toolbox. It processes data from Splunk searches and creates interactive timeline visualizations with support for categories, legends, time-based navigation, and optional hourly interval splitting.

**File Location**: `appserver/static/visualizations/hman/src/buildTimelineOption/index.js`

---

## Table of Contents

1. [Dependencies](#dependencies)
2. [Module Exports](#module-exports)
3. [Global Variables](#global-variables)
4. [Functions](#functions)
   - [reInitializeDataHolders](#reinitializedataholders)
   - [renderItemForHour](#renderitemforhour)
   - [renderItemLogic](#renderitemlogic)
   - [_buildTimelineOption](#_buildtimelineoption)
5. [Event Handlers](#event-handlers)
6. [Referenced Functions](#referenced-functions)
7. [Data Flow](#data-flow)
8. [Configuration](#configuration)
9. [Error Handling](#error-handling)

---

## Dependencies

### External Libraries

```javascript
const SplunkVisualizationUtils = require('api/SplunkVisualizationUtils');
const echarts = require('echarts');
const lodashFind = require('lodash.find');
```

- **SplunkVisualizationUtils**: Splunk API utility for theme detection and visualization helpers
- **echarts**: Apache ECharts library for data visualization
- **lodash.find**: Lodash utility function for finding objects in arrays

### Internal Modules

The module relies on the following internal functions accessible via `this`:

- `this._parseOption()` - Parses configuration options from XML dashboard
- `this._setCustomTokens()` - Sets Splunk tokens for drilldown functionality
- `this._setSplunkMessages()` - Displays toast messages to users
- `this._sharedFunctions` - Collection of shared utility functions
- `this.getPropertyNamespaceInfo()` - Gets property namespace information
- `this.scopedVariables` - Access to scoped variables like timeRange

---

## Module Exports

```javascript
module.exports = _buildTimelineOption;
```

The module exports a single function `_buildTimelineOption` that constructs an ECharts option object for timeline visualization.

---

## Global Variables

### State Management Variables

```javascript
let processedData = [];              // Processed data for timeline visualization
let optionFromXmlDashboard = {};     // Configuration parsed from XML dashboard
let processedLegends = [];           // Array of legend configurations
let manuallyAddedLegends = [];       // Legend items for display
let manuallySelectedLegends = {};    // Legend selection state
let processedCategories = [];        // Array of unique categories (y-axis)
let tmpLocaleOption = 'en-GB';       // Locale for date/time formatting
let xAxisDataMinValue = '';          // Minimum x-axis timestamp
let xAxisDataMaxValue = '';          // Maximum x-axis timestamp
let xAxisStartDates = [];            // Collection of event start dates
let yAxisListedHours = [];           // Hourly labels for y-axis (when splitByHour is enabled)
let hourlyIntervals = [];            // Hourly interval metadata
```

### Theme Variables

```javascript
const currentTheme = SplunkVisualizationUtils.getCurrentTheme();
const genericTextColor = currentTheme === 'dark' ? '#fff' : '#000';
```

- Automatically detects Splunk theme (light/dark)
- Sets appropriate text colors for accessibility

### Locale Configuration

```javascript
if (typeof window._i18n_locale !== 'undefined' && typeof window._i18n_locale.locale_name !== 'undefined') {
  tmpLocaleOption = window._i18n_locale.locale_name.replace('_', '-');
}
```

- Reads Splunk's internationalization locale
- Defaults to 'en-GB' if not available
- Converts underscore to hyphen format (e.g., 'en_US' → 'en-US')

---

## Functions

### reInitializeDataHolders

**Location**: Lines 23-35

**Purpose**: Resets all global state variables to their initial empty states.

**Signature**:
```javascript
function reInitializeDataHolders()
```

**Parameters**: None

**Returns**: `undefined`

**Description**:
Called at the beginning of `_buildTimelineOption` to ensure clean state for each render cycle. This prevents data pollution from previous visualizations.

**Variables Reset**:
- `processedData` → `[]`
- `optionFromXmlDashboard` → `{}`
- `processedLegends` → `[]`
- `manuallyAddedLegends` → `[]`
- `manuallySelectedLegends` → `{}`
- `processedCategories` → `[]`
- `xAxisDataMinValue` → `''`
- `xAxisDataMaxValue` → `''`
- `xAxisStartDates` → `[]`
- `yAxisListedHours` → `[]`
- `hourlyIntervals` → `[]`

---

### renderItemForHour

**Location**: Lines 37-91

**Purpose**: Custom render function for ECharts when `splitByHour` mode is enabled. Draws timeline rectangles across hourly intervals.

**Signature**:
```javascript
function renderItemForHour(params, api)
```

**Parameters**:
- `params` (Object) - ECharts render parameters
  - `params.context` (Object) - Persistent context object for the render cycle
  - `params.dataIndex` (Number) - Index of the current data item
- `api` (Object) - ECharts rendering API
  - `api.coord([x, y])` - Converts data values to pixel coordinates
  - `api.size([width, height])` - Returns size in pixels
  - `api.style()` - Returns style configuration

**Returns**: `Object | undefined`
- Returns a render group object containing rectangle drawings
- Returns `undefined` if data is invalid

**Algorithm**:

1. **Initialize Counter**: Tracks rendering iterations
   ```javascript
   if (params.context.counter === undefined) {
     params.context.counter = 0;
   }
   ```

2. **Retrieve Event Data**: Gets processed data by index
   ```javascript
   const eventItemData = processedData[params.dataIndex];
   ```

3. **Calculate Event Timing**:
   - Extract event duration in seconds
   - Calculate start minute and position
   - Determine available drawing space in the first hour

4. **Draw Rectangles Across Hours**:
   - Uses `while` loop to handle events spanning multiple hours
   - Creates rectangle shapes using `api.coord()` for positioning
   - Adjusts for remaining duration and wraps to next hour
   - Maximum 3600 seconds (1 hour) per row

5. **Rectangle Configuration**:
   ```javascript
   const rectShape = {
     x: pointStart[0],                          // Left position
     y: pointStart[1] - api.size([0, 1])[1] / 2, // Vertical center
     width: pointEnd[0] - pointStart[0],        // Calculated width
     height: api.size([0, 1])[1] * 0.8,         // 80% of available height
   };
   ```

6. **Return Group**: All rectangles wrapped in a group element
   ```javascript
   return {
     type: 'group',
     children: rectangleDrawingsArray,
   };
   ```

**Special Handling**:
- Events spanning multiple hours create multiple rectangles
- Each rectangle aligns with hourly y-axis categories
- Uses `matchedHourlyIntervals` to determine which rows to draw on

---

### renderItemLogic

**Location**: Lines 93-121

**Purpose**: Default custom render function for timeline visualization without hourly splitting.

**Signature**:
```javascript
function renderItemLogic(params, api)
```

**Parameters**:
- `params` (Object) - ECharts render parameters
  - `params.coordSys` - Coordinate system boundaries
- `api` (Object) - ECharts rendering API
  - `api.value(index)` - Gets value at specified dimension index
  - `api.coord([x, y])` - Converts to pixel coordinates
  - `api.size([w, h])` - Returns size in pixels
  - `api.style()` - Base style
  - `api.styleEmphasis()` - Emphasis (hover) style

**Returns**: `Object | null`
- Returns rectangle shape configuration
- Returns `null` if rectangle is clipped outside visible area

**Algorithm**:

1. **Extract Dimensions**:
   ```javascript
   var categoryIndex = api.value(2);  // Y-axis category
   var start = api.coord([api.value(0), categoryIndex]);  // Start time
   var end = api.coord([api.value(1), categoryIndex]);    // End time
   ```

2. **Calculate Rectangle**:
   ```javascript
   var height = api.size([0, 1])[1] * 0.6;  // 60% of category height
   var rectShape = {
     x: start[0],
     y: start[1] - height / 2,
     width: end[0] - start[0],
     height: height
   };
   ```

3. **Clip to Viewport**: Uses `echarts.graphic.clipRectByRect()` to ensure rectangles stay within chart boundaries

4. **Return Configuration**:
   ```javascript
   return rectShape && {
     type: 'rect',
     transition: ['shape'],
     shape: rectShape,
     style: api.style(),
     styleEmphasis: api.styleEmphasis(),
   };
   ```

---

### _buildTimelineOption

**Location**: Lines 123-690

**Purpose**: Main function that builds the complete ECharts option object for timeline visualization.

**Signature**:
```javascript
const _buildTimelineOption = function (data, config, tmpChartInstance)
```

**Context**: `this` refers to the visualization instance with access to shared functions and configuration.

**Parameters**:
- `data` (Object) - Splunk search result data
  - `data.fields` (Array) - Field definitions (min 4 required: start_time, end_time, internal_name, category, [optional: fill_color])
  - `data.rows` (Array) - Data rows matching field structure
- `config` (Object) - Configuration from XML dashboard
  - `config[namespace + "option"]` - Custom ECharts options
  - `config[namespace + "useSplunkCategoricalColors"]` - Boolean flag for color palette
  - `config[namespace + "splitByHour"]` - Boolean flag to enable hourly splitting
- `tmpChartInstance` (Object) - ECharts instance for event binding

**Returns**: `Object | null`
- Returns complete ECharts option object
- Returns `null` if configuration is invalid

**Workflow**:

#### 1. Initialization (Lines 124-140)
```javascript
reInitializeDataHolders();
let computedOption = {};
let configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];
let useSplunkCategoricalColors = config[...];
let splitByHour = config[...];
optionFromXmlDashboard = this._parseOption(configOption);
const _setCustomTokens = this._setCustomTokens;
const _setSplunkMessages = this._setSplunkMessages;
```

#### 2. Data Validation (Lines 141-189)

**Field Count Validation**:
- Requires 4 fields minimum with Splunk colors
- Requires 5 fields with custom colors
- Throws error if insufficient fields

**Row Limit**:
```javascript
if(data.rows.length > 50000) {
  _setSplunkMessages("info", "The visualization displays only 50000 rows...");
  data.rows = data.rows.slice(0, 50000);
}
```

**Data Cleaning**:
```javascript
let cleanDataRows = data.rows.filter(row =>
  row.slice(0, 4).every(value =>
    value !== "" && value !== null && value !== undefined
  )
);
```

#### 3. Color Assignment (Lines 190-235)

**Option A - Splunk Categorical Colors**:
```javascript
if (useSplunkCategoricalColors.toLowerCase() === 'true') {
  const uniqueCategories = [...new Set(cleanDataRows.map(dataRow => dataRow[3]))];
  const colorPalette = this._sharedFunctions.generateColorPalette(uniqueCategories.length);
  const categoryColors = {...}; // Map categories to colors
  cleanDataRows = enhancedRowsWithColorPalette; // Add color column
}
```

**Option B - Custom Colors with Fallback**:
```javascript
else {
  const categoriesWithEmptyColorColumnValues = new Set();
  // Find rows with empty fill_color
  // Generate palette for missing colors
  // Assign colors to rows with empty values
}
```

#### 4. Legend and Category Creation (Lines 238-267)

```javascript
cleanDataRows.forEach((tmpRow) => {
  const tmpLegendValue = tmpRow[configLegendsDataIndexBinding];
  const tmpColorValue = tmpRow[configColorDataIndexBinding];

  if (!processedCategories.includes(tmpValue)) {
    processedCategories.push(tmpValue);
  }

  if (!lodashFind(processedLegends, { 'name': tmpLegendValue })) {
    processedLegends.push({
      type: "text",
      name: tmpLegendValue,
      fillColor: tmpColorValue,
    });
    manuallyAddedLegends.push({...});
    manuallySelectedLegends[tmpLegendValue] = true;
  }
});
```

**Category Sorting**:
```javascript
processedCategories = processedCategories.sort().reverse();
```

#### 5. Hourly Interval Processing (Lines 269-309)

When `splitByHour === true`:

**Time Boundary Validation**:
```javascript
if (typeof this.scopedVariables['timeRange'] === 'undefined' || ...) {
  _setSplunkMessages("error", "Update the query with | addinfo");
  throw "The search results do not have time boundraries...";
}
```

**Interval Generation**:
```javascript
const oneHourInMs = 60 * 60 * 1000;
for (let t = minTimeRounded; t < maxTime; t += oneHourInMs) {
  hourlyIntervals.push({
    id: tmpIdCounter,
    start: t,
    startHour: startTimeString,
    end: Math.min(t + oneHourInMs, maxTime),
  });
}
```

**Y-Axis Labels**:
```javascript
yAxisListedHours = this._sharedFunctions.getHourlyIntervals(rawEventsStartTime, rawEventsEndTime);
```

#### 6. Data Processing (Lines 312-382)

For each row:

1. **Extract Values**:
   ```javascript
   const tmpStartTime = tmpRow[0];  // Unix timestamp
   const tmpEndTime = tmpRow[1];
   const tmpInternalName = tmpRow[2];
   const tmpReason = tmpRow[3];
   const tmpColor = tmpRow[4];
   ```

2. **Validate Timestamps**:
   ```javascript
   if (!this._sharedFunctions.isValidUnixTimestamp(tmpStartTime)) {
     throw "Error: First value from the data is not a valid unix timestamp!";
   }
   ```

3. **Calculate Metrics**:
   ```javascript
   const tmpDuration = tmpEndTime - tmpStartTime;
   const tmpProcessedInternalNameIdx = processedCategories.findIndex(...);
   ```

4. **Track Min/Max**:
   ```javascript
   if (xAxisDataMinValue === '' || tmpStartTime < xAxisDataMinValue) {
     xAxisDataMinValue = tmpStartTime;
   }
   ```

5. **Match Hourly Intervals**:
   ```javascript
   let tmpMatchedHourlyIntervals = [];
   hourlyIntervals.forEach(interval => {
     if ((tmpEndTime * 1000) > interval.start && (tmpStartTime * 1000) < interval.end) {
       tmpMatchedHourlyIntervals.push(interval.id);
     }
   });
   ```

6. **Create Data Object**:
   ```javascript
   let customDataObj = {
     name: tmpReason,
     value: dynamicValue, // Enhanced array with computed values
     itemStyle: { color: tmpColor },
     eventDurationInSeconds: tmpDuration,
     matchedHourlyIntervals: tmpMatchedHourlyIntervals,
     utilityFunctions: {
       displayDate: this._sharedFunctions.extractDate,
       displayTime: this._sharedFunctions.extractTime,
       escapeHtml: this._sharedFunctions.escapeHtml,
     }
   };
   processedData.push(customDataObj);
   ```

#### 7. ECharts Configuration (Lines 389-566)

**Grid Configuration** (Lines 394-402):
```javascript
computedOption.grid = {
  height: splitByHour ? (35 * yAxisListedHours.length) : 300,
  left: '5%',
  top: 80,
  containLabel: true,
};
```

**X-Axis Configuration**:

*Normal Mode* (Lines 405-437):
```javascript
computedOption.xAxis = [{
  type: "time",
  boundaryGap: false,
  axisLabel: {
    formatter: {
      year: '{yyyy}',
      month: '{MMM}',
      day: '{dayStyle|{d} {MMM}}',
      hour: '{HH}:{mm}',
      minute: '{HH}:{mm}',
    }
  }
}];
```

*Hourly Mode* (Lines 438-459):
```javascript
computedOption.xAxis = {
  type: 'value',
  min: 0,
  max: 3600,
  interval: 600, // 10-minute intervals
  axisLabel: {
    formatter: function (value) {
      const minutes = Math.floor(value / 60);
      return minutes < 10 ? `0${minutes}:00` : `${minutes}:00`;
    }
  }
};
```

**Y-Axis Configuration** (Lines 462-474):
```javascript
computedOption.yAxis = {
  type: 'category',
  axisTick: { show: true },
  data: splitByHour ? yAxisListedHours : processedCategories
};
```

**Data Zoom** (Lines 477-494):
```javascript
computedOption.dataZoom = [
  {
    type: 'slider',
    start: 0,
    end: 100,
    labelFormatter: function (value) {
      return new Date(value).toLocaleTimeString([tmpLocaleOption], {...})
    }
  },
  { type: 'inside', start: 50, end: 70 }
];
```

**Series Configuration** (Lines 497-527):
```javascript
computedOption.series = [{
  id: 'timelineData',
  type: 'custom',
  renderItem: splitByHour ? renderItemForHour : renderItemLogic,
  encode: {
    x: [computedDimensions[0], computedDimensions[1]], // start_time, end_time
    y: computedDimensions[3], // category
  },
  dimensions: computedDimensions,
  data: processedData,
}];

// Add legend placeholder series
processedLegends.forEach((el) => {
  computedOption.series.push({
    type: 'line',
    name: el.name,
    itemStyle: { color: el.fillColor },
    data: [],
  });
});
```

**Legend Configuration** (Lines 529-566):
```javascript
computedOption.legend = {
  selected: manuallySelectedLegends,
  data: manuallyAddedLegends,
  textStyle: { color: genericTextColor, fontSize: 13 },
  top: 30
};
```

#### 8. Event Handler Registration (Lines 568-679)

See [Event Handlers](#event-handlers) section for details.

#### 9. Final Option Merge (Lines 682-688)
```javascript
for (var tmpOptionKey in optionFromXmlDashboard) {
  if (tmpOptionKey !== 'yAxis' && tmpOptionKey !== 'series' && tmpOptionKey !== 'legend') {
    computedOption[tmpOptionKey] = optionFromXmlDashboard[tmpOptionKey];
  }
}
return computedOption;
```

---

## Event Handlers

### Highlight Event Handler

**Location**: Lines 568-608

**Purpose**: Applies opacity to non-highlighted timeline items when hovering over a legend.

**Trigger**: `tmpChartInstance.on('highlight', ...)`

**Logic**:
1. Get highlighted series name
2. Check if legend is deselected (skip if true)
3. Find all data items NOT matching the highlighted name
4. Apply opacity: 0 to non-matching items
5. Update chart with modified data

```javascript
tmpChartInstance.on('highlight', function (params) {
  const highlightedName = params.seriesName;
  if (deselectedLegends.includes(highlightedName)) return;

  const indicesToHighlight = [];
  tmpXseriesData.forEach((item, index) => {
    if (item.name !== highlightedName) {
      indicesToHighlight.push(index);
    }
  });

  const rowsOfDataFromSelectedLegends = tmpXseriesData.map((item, index) => {
    if (indicesToHighlight.includes(index)) {
      return { ...item, itemStyle: { ...item.itemStyle, opacity: 0 } };
    }
    return item;
  });

  tmpChartInstance.setOption({
    series: [{ id: 'timelineData', data: rowsOfDataFromSelectedLegends }]
  }, { notMerge: false });
});
```

---

### Downplay Event Handler

**Location**: Lines 610-636

**Purpose**: Restores full opacity to all items when mouse leaves legend area.

**Trigger**: `tmpChartInstance.on('downplay', ...)`

**Logic**:
1. Get series name being downplayed
2. Check if legend is deselected (skip if true)
3. Restore opacity: 1 to all items
4. Update chart

```javascript
tmpChartInstance.on('downplay', function (params) {
  const highlightedName = params.seriesName;
  if (deselectedLegends.includes(highlightedName)) return;

  const rowsOfDataFromSelectedLegends = tmpXseriesData.map(item => ({
    ...item,
    itemStyle: { ...item.itemStyle, opacity: 1 }
  }));

  tmpChartInstance.setOption({
    series: [{ id: 'timelineData', data: rowsOfDataFromSelectedLegends }]
  }, { notMerge: false });
});
```

---

### Legend Select Changed Handler

**Location**: Lines 644-671

**Purpose**: Filters timeline data when legends are toggled on/off.

**Trigger**: `tmpChartInstance.on('legendselectchanged', ...)`

**Logic**:
1. Get legend name and selection state
2. Update `deselectedLegends` array
3. Filter data to show only selected legend items
4. Update chart with filtered data

```javascript
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
    return !deselectedLegends.includes(dataRow.name);
  });

  tmpChartInstance.setOption({
    series: [{ id: 'timelineData', data: rowsOfDataFromSelectedLegends }]
  }, { notMerge: false });
});
```

---

### Click Event Handler

**Location**: Lines 674-679

**Purpose**: Handles drilldown when clicking on timeline rectangles.

**Trigger**: `tmpChartInstance.on('click', 'series', ...)`

**Logic**:
1. Get current chart option
2. Check if clicked item's legend is selected
3. Call `_setCustomTokens` to populate Splunk tokens
4. Trigger drilldown action

```javascript
tmpChartInstance.on('click', 'series', function (params) {
  const shlOptionTmp = tmpChartInstance.getOption();
  if (shlOptionTmp.legend[0].selected[params.name]) {
    _setCustomTokens(params, tmpChartInstance);
  }
});
```

---

## Referenced Functions

### From `this._parseOption`

**Source**: [parseOption/index.js](parseOption/index.js)

**Purpose**: Parses and validates configuration option string from XML dashboard.

**Behavior**:
- Checks for unresolved Splunk tokens (e.g., `$token$`)
- Validates escaped dollar signs (`$$`)
- Uses `eval()` to convert string to object
- Returns `null` if tokens are unresolved
- Returns parsed object if valid

**Usage in buildTimelineOption**:
```javascript
optionFromXmlDashboard = this._parseOption(configOption);
if (optionFromXmlDashboard == null) {
  return null;
}
```

---

### From `this._setCustomTokens`

**Source**: [setCustomTokens/index.js](setCustomTokens/index.js)

**Purpose**: Sets Splunk tokens and triggers drilldown actions.

**Tokens Set**:
- `hman_ts_duration` - Event duration
- `hman_ts_series` - Series/internal name
- `hman_ts_legend` - Category/legend name
- `hman_ts_color` - Fill color
- `hman_ts_start_time` - Start timestamp
- `hman_ts_end_time` - End timestamp

**Workflow**:
1. Gets Splunk token model
2. Sets token values from clicked data
3. Retrieves drilldown link template
4. Replaces tokens in drilldown URL
5. Triggers Splunk drilldown event

**Usage in buildTimelineOption**:
```javascript
tmpChartInstance.on('click', 'series', function (params) {
  _setCustomTokens(params, tmpChartInstance);
});
```

---

### From `this._setSplunkMessages`

**Source**: [setSplunkMessages/index.js](setSplunkMessages/index.js)

**Purpose**: Displays toast notifications to users.

**Signature**:
```javascript
_setSplunkMessages(type="info", message)
```

**Parameters**:
- `type` (String) - Message type: "info" or "error"
- `message` (String) - Message text to display

**Behavior**:
- Creates fixed-position toast at top of screen
- Styles based on type (error = red background)
- Auto-dismisses after 3 seconds
- Includes close button for manual dismissal

**Usage in buildTimelineOption**:
```javascript
if(data.rows.length > 50000) {
  _setSplunkMessages("info", "The visualization displays only 50000 rows...");
}

if (typeof this.scopedVariables['timeRange'] === 'undefined') {
  _setSplunkMessages("error", "Update the query with | addinfo");
}
```

---

### From `this._sharedFunctions`

**Source**: [sharedFunctions/index.js](sharedFunctions/index.js)

Shared utility functions used throughout the module:

#### isValidUnixTimestamp(strTimestamp)

**Purpose**: Validates Unix timestamp values.

**Validation Rules**:
- Must be a number or numeric string
- Must be finite (not NaN, Infinity)
- Must be positive integer
- Must be within range: 0 to 2147483647000 (1970-2038)
- Must create valid Date object

**Usage**:
```javascript
if (!this._sharedFunctions.isValidUnixTimestamp(tmpStartTime)) {
  throw "Error: First value from the data is not a valid unix timestamp!";
}
```

---

#### generateColorPalette(numColors)

**Purpose**: Generates array of Splunk categorical colors.

**Parameters**:
- `numColors` (Number) - How many colors to generate

**Returns**: `Array<String>` - Array of hex color codes

**Behavior**:
- Uses predefined Splunk color palette (60 colors)
- Cycles through palette if more colors needed
- Always starts from beginning of palette

**Usage**:
```javascript
const colorPalette = this._sharedFunctions.generateColorPalette(uniqueCategories.length);
```

---

#### isColorCode(colorCode)

**Purpose**: Validates if string is a valid color code.

**Supported Formats**:
- Hex: `#fff`, `#ffffff`, `fff`, `ffffff`
- RGB: `rgb(255, 255, 255)`
- RGBA: `rgba(255, 255, 255, 0.5)`
- HSL: `hsl(360, 100%, 50%)`

**Returns**: `Boolean`

**Usage**:
```javascript
const dataRowsIsValidColor = this._sharedFunctions.isColorCode(data.rows[0][4]);
if (!dataRowsIsValidColor) {
  console.log(`The 5th data field is not a valid color code!`);
}
```

---

#### getHourlyIntervals(startTimestamp, endTimestamp)

**Purpose**: Generates array of formatted hourly labels for y-axis.

**Parameters**:
- `startTimestamp` (Number) - Start time in milliseconds
- `endTimestamp` (Number) - End time in milliseconds

**Returns**: `Array<String>` - Array of formatted time labels

**Label Format Logic**:
- Different year: `"YY/MM/DD HH:MM"`
- Different day: `"MM/DD HH:MM"`
- Same day: `"HH:MM"`

**Usage**:
```javascript
yAxisListedHours = this._sharedFunctions.getHourlyIntervals(rawEventsStartTime, rawEventsEndTime);
```

---

#### extractDate(strTimestamp)

**Purpose**: Formats Unix timestamp as date string.

**Returns**: Locale-aware date string (e.g., "DD/MM/YYYY")

**Usage**:
```javascript
customDataObj = {
  utilityFunctions: {
    displayDate: this._sharedFunctions.extractDate,
  }
};
```

---

#### extractTime(strTimestamp)

**Purpose**: Formats Unix timestamp as time string.

**Returns**: Locale-aware time string (e.g., "HH:MM" or "HH:MM AM/PM")

**Usage**:
```javascript
customDataObj = {
  utilityFunctions: {
    displayTime: this._sharedFunctions.extractTime,
  }
};
```

---

#### escapeHtml(str)

**Purpose**: Escapes HTML entities for safe display (referenced but not shown in sharedFunctions).

**Usage**:
```javascript
customDataObj = {
  utilityFunctions: {
    escapeHtml: this._sharedFunctions.escapeHtml,
  }
};
```

---

#### replacePropertiesFromTemplate(dataArray, template, keys)

**Purpose**: Replaces specified properties in objects with values from template.

**Parameters**:
- `dataArray` (Array<Object>) - Objects to modify
- `template` (Object) - Source of replacement values
- `keys` (Array<String>) - Properties to replace

**Side Effects**: Modifies `dataArray` in place

**Usage**:
```javascript
const overrideableLegendProperties = [
  "icon", "itemStyle", "lineStyle", "inactiveColor",
  "inactiveBorderColor", "symbolRotate", "textStyle"
];
this._sharedFunctions.replacePropertiesFromTemplate(
  computedOption.legend.data,
  optionFromXmlDashboard.legend,
  overrideableLegendProperties
);
```

---

## Data Flow

### Input Data Structure

Expected Splunk search result format:

```javascript
{
  fields: [
    { name: "start_time" },   // Field 0 - Unix timestamp
    { name: "end_time" },     // Field 1 - Unix timestamp
    { name: "internal_name" }, // Field 2 - Category identifier
    { name: "category" },     // Field 3 - Legend name
    { name: "fill_color" }    // Field 4 - Color (optional with useSplunkCategoricalColors)
  ],
  rows: [
    [1609459200, 1609462800, "Server1", "Maintenance", "#ff0000"],
    [1609466400, 1609470000, "Server2", "Downtime", "#00ff00"],
    // ... more rows
  ]
}
```

---

### Data Transformation Pipeline

```
Raw Splunk Data
      ↓
Data Validation & Cleaning
      ↓
Color Assignment (Splunk palette or custom)
      ↓
Legend & Category Extraction
      ↓
Hourly Interval Calculation (if splitByHour)
      ↓
Data Processing & Enhancement
      ↓
ECharts Option Construction
      ↓
Event Handler Registration
      ↓
Final Option Object
```

---

### Processed Data Structure

Each item in `processedData` array:

```javascript
{
  name: "Maintenance",              // Legend/category name
  value: [
    1609459200000,                  // [0] start_time (ms)
    1609462800000,                  // [1] end_time (ms)
    "Server1",                      // [2] internal_name
    "Maintenance",                  // [3] category
    "#ff0000",                      // [4] fill_color
    3600,                           // [5] duration (seconds)
    0,                              // [6] legend_index
    1609459200,                     // [7] unix_start_time (seconds)
    1609462800                      // [8] unix_end_time (seconds)
  ],
  itemStyle: {
    color: "#ff0000"
  },
  eventDurationInSeconds: 3600,
  matchedHourlyIntervals: [0, 1],   // Y-axis rows (for splitByHour mode)
  utilityFunctions: {
    displayDate: function,
    displayTime: function,
    escapeHtml: function
  }
}
```

---

## Configuration

### XML Dashboard Configuration

#### Basic Timeline

```xml
<viz type="visualization_toolbox.hman">
  <search>
    <query>
      | makeresults count=10
      | eval start_time=relative_time(now(), "-1h")
      | eval end_time=now()
      | eval internal_name="Server" + (random() % 5)
      | eval category=case(random() % 3 == 0, "Maintenance", random() % 3 == 1, "Downtime", 1=1, "Available")
      | eval fill_color=case(category="Maintenance", "#ff0000", category="Downtime", "#ffaa00", 1=1, "#00ff00")
      | table start_time end_time internal_name category fill_color
    </query>
  </search>
  <option name="visualization_toolbox.hman.useSplunkCategoricalColors">false</option>
  <option name="visualization_toolbox.hman.splitByHour">false</option>
</viz>
```

---

#### Timeline with Hourly Splitting

**IMPORTANT**: When using `splitByHour`, the visualization requires access to `earliest` and `latest` Splunk tokens from the dashboard's time range selector. These tokens must be available in the scoped variables.

```xml
<form>
  <label>Timeline with Hourly Splitting</label>
  <fieldset submitButton="false">
    <input type="time" token="time_token" searchWhenChanged="true">
      <label>Time Range</label>
      <default>
        <earliest>-24h@h</earliest>
        <latest>now</latest>
      </default>
    </input>
  </fieldset>

  <row>
    <panel>
      <viz type="visualization_toolbox.hman">
        <search>
          <query>
            | makeresults
            | eval start_time=relative_time(now(), "-2h")
            | eval end_time=now()
            | eval internal_name="Process1"
            | eval category="Running"
            | table start_time end_time internal_name category
          </query>
          <earliest>$time_token.earliest$</earliest>
          <latest>$time_token.latest$</latest>
        </search>
        <option name="visualization_toolbox.hman.useSplunkCategoricalColors">true</option>
        <option name="visualization_toolbox.hman.splitByHour">true</option>
      </viz>
    </panel>
  </row>
</form>
```

**Note**: The `earliest` and `latest` tokens from the time range picker are automatically passed to the visualization's scoped variables. The visualization uses these to generate hourly intervals on the y-axis, not the individual event times.

---

#### With Custom ECharts Options (Without splitByHour)

```xml
<option name="visualization_toolbox.hman.option">
{
  "tooltip": {
    "trigger": "item",
    "formatter": function(params) {
      var startDate = params.data.utilityFunctions.displayDate(params.data.value[7]);
      var startTime = params.data.utilityFunctions.displayTime(params.data.value[7]);
      var endDate = params.data.utilityFunctions.displayDate(params.data.value[8]);
      var endTime = params.data.utilityFunctions.displayTime(params.data.value[8]);
      var duration = params.data.eventDurationInSeconds;
      return params.data.utilityFunctions.escapeHtml(params.name) +
             "<br/>Start: " + startDate + " " + startTime +
             "<br/>End: " + endDate + " " + endTime +
             "<br/>Duration: " + duration + "s";
    }
  },
  "grid": {
    "left": "10%",
    "right": "10%",
    "top": 80,
    "height": 300,
    "containLabel": true
  },
  "xAxis": [{
    "type": "time",
    "boundaryGap": false,
    "axisLabel": {
      "formatter": {
        "year": "{yyyy}",
        "month": "{MMM}",
        "day": "{dayStyle|{d} {MMM}}",
        "hour": "{HH}:{mm}",
        "minute": "{HH}:{mm}"
      }
    }
  }],
  "dataZoom": [
    {
      "type": "slider",
      "start": 0,
      "end": 100
    },
    {
      "type": "inside",
      "start": 50,
      "end": 70
    }
  ]
}
</option>
```

**Key Features for Non-Split Mode**:
- `xAxis.type`: Set to `"time"` for timeline-based x-axis
- `dataZoom`: Enabled for zooming and panning the timeline
- `grid.height`: Fixed height (default 300px)
- Tooltip formatter has access to `params.data.utilityFunctions` for date/time formatting

---

#### With Custom ECharts Options (With splitByHour)

```xml
<option name="visualization_toolbox.hman.option">
{
  "tooltip": {
    "trigger": "item",
    "formatter": function(params) {
      var startDate = params.data.utilityFunctions.displayDate(params.data.value[7]);
      var startTime = params.data.utilityFunctions.displayTime(params.data.value[7]);
      var endDate = params.data.utilityFunctions.displayDate(params.data.value[8]);
      var endTime = params.data.utilityFunctions.displayTime(params.data.value[8]);
      var duration = params.data.eventDurationInSeconds;
      var hours = Math.floor(duration / 3600);
      var minutes = Math.floor((duration % 3600) / 60);
      var seconds = duration % 60;
      return params.data.utilityFunctions.escapeHtml(params.name) +
             "<br/>Start: " + startDate + " " + startTime +
             "<br/>End: " + endDate + " " + endTime +
             "<br/>Duration: " + hours + "h " + minutes + "m " + seconds + "s";
    }
  },
  "grid": {
    "left": "5%",
    "right": "5%",
    "top": 80,
    "containLabel": true
  },
  "xAxis": {
    "type": "value",
    "min": 0,
    "max": 3600,
    "interval": 600,
    "name": "Time in Hour (Minutes)",
    "nameLocation": "middle",
    "nameGap": 25,
    "axisLabel": {
      "formatter": function (value) {
        var minutes = Math.floor(value / 60);
        return minutes < 10 ? "0" + minutes + ":00" : minutes + ":00";
      }
    }
  }
}
</option>
```

**Key Features for splitByHour Mode**:
- `xAxis.type`: Set to `"value"` (not "time") representing seconds within an hour (0-3600)
- `xAxis.min`/`max`: Always 0 to 3600 seconds
- `xAxis.interval`: 600 seconds (10 minutes) for readable tick marks
- `grid.height`: Automatically calculated based on hourly intervals (35px per hour)
- `dataZoom`: Not recommended (events are split across rows)
- Y-axis automatically populated with hourly labels
- Events spanning multiple hours create rectangles across multiple rows

---

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `useSplunkCategoricalColors` | Boolean/String | - | If "true", auto-generates colors from Splunk palette |
| `splitByHour` | Boolean/String | false | If "true", splits timeline into hourly rows |
| `option` | String (JSON) | {} | Custom ECharts configuration options |

---

## Error Handling

### Validation Errors

#### Insufficient Fields
```javascript
if (data.fields.length < nrOfDataFieldsToBeCheckedFor) {
  throw `Error: This visualization needs at least ${nrOfDataFieldsToBeCheckedFor} different fields...`;
}
```

#### Invalid Timestamps
```javascript
if (!this._sharedFunctions.isValidUnixTimestamp(tmpStartTime)) {
  throw "Error: First value from the data is not a valid unix timestamp!";
}
```

#### Missing Time Boundaries (splitByHour mode)
```javascript
if (typeof this.scopedVariables['timeRange'] === 'undefined' ||
    this.scopedVariables['timeRange']['earliest'] === '' ||
    this.scopedVariables['timeRange']['latest'] === '') {
  _setSplunkMessages("error", "The search results do not have time boundaries. Make sure you have earliest and latest splunk tokens.");
  throw "The search results do not have time boundaries. Make sure you have earliest and latest splunk tokens.";
}
```

**Resolution**: Ensure your dashboard includes a time range picker and that the search element includes `<earliest>` and `<latest>` tags referencing the time picker tokens.

#### Malformed Categories
```javascript
if (tmpProcessedInternalNameIdx < 0) {
  throw 'Error: The search result has malformed internal_name field mapping';
}
```

---

### Warning Messages

#### Row Limit Exceeded
```javascript
if(data.rows.length > 50000) {
  _setSplunkMessages("info", "The visualization displays only 50000 rows from the current search result!");
  data.rows = data.rows.slice(0, 50000);
}
```

#### Invalid Color Code
```javascript
if (!dataRowsIsValidColor) {
  console.log(`The 5th data field is not a valid color code! It is going to be prefilled with a splunk categorical color.`);
}
```

#### Too Many Hourly Intervals
```javascript
if(yAxisListedHours.length > 25) {
  _setSplunkMessages("error", "The time range too large. This visualization is adapted only for maximum 24 hourly intervals...");
}
```

---

## Best Practices

### Query Design

1. **Always include all required fields**:
   ```spl
   | table start_time end_time internal_name category [fill_color]
   ```

2. **For splitByHour mode, ensure time range tokens are available**:
   - Add a time range picker to your dashboard
   - Include `<earliest>` and `<latest>` tags in the search element
   - These tokens derive from the dashboard's time range selector

3. **Use valid Unix timestamps** (seconds):
   ```spl
   | eval start_time=strptime(start_time_str, "%Y-%m-%d %H:%M:%S")
   ```

4. **Limit results for performance**:
   ```spl
   | head 50000
   ```

---

### Performance Optimization

1. **Avoid excessive categories**: Keep under 100 unique categories for readable y-axis
2. **Limit time range for splitByHour**: Maximum 24 hours recommended
3. **Use server-side filtering**: Filter in SPL query rather than post-processing
4. **Minimize custom renderItem complexity**: Keep draw operations simple

---

### Accessibility

1. **Use high-contrast colors**: Especially in dark mode
2. **Provide meaningful category names**: Avoid cryptic abbreviations
3. **Test with different locales**: Ensure date/time formatting works
4. **Ensure drilldown is keyboard-accessible**: Follow Splunk standards

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Empty visualization | Unresolved tokens in option | Check `_parseOption` returns non-null |
| Missing time boundaries | splitByHour without time range tokens | Add time range picker and `<earliest>/<latest>` tags |
| Color validation fails | Invalid hex/rgb codes | Use valid color format or enable Splunk colors |
| Y-axis overflow | Too many categories | Filter data or increase grid height |
| Rectangles not visible | Events outside time range | Check timestamp validity |
| Drilldown not working | Missing event handler setup | Verify click event registration |

---

## Dependencies Graph

```
buildTimelineOption/index.js
├── api/SplunkVisualizationUtils
│   └── getCurrentTheme()
├── echarts
│   └── graphic.clipRectByRect()
├── lodash.find
├── parseOption/index.js
│   └── _parseOption()
├── setCustomTokens/index.js
│   └── _setCustomTokens()
├── setSplunkMessages/index.js
│   └── _setSplunkMessages()
└── sharedFunctions/index.js
    ├── isValidUnixTimestamp()
    ├── generateColorPalette()
    ├── isColorCode()
    ├── getHourlyIntervals()
    ├── extractDate()
    ├── extractTime()
    ├── escapeHtml()
    └── replacePropertiesFromTemplate()
```

---

## Version Information

- **File**: buildTimelineOption/index.js
- **Visualization**: hman (Timeline Visualization)
- **Part of**: Splunk Visualization Toolbox
- **License**: MIT (See visualization_source.js)

---

## Additional Resources

- [ECharts Custom Series Documentation](https://echarts.apache.org/en/option.html#series-custom)
- [Splunk Visualization API](https://docs.splunk.com/Documentation/Splunk/latest/AdvancedDev/CustomVizDevOverview)
- [Splunk Drilldown Documentation](https://docs.splunk.com/Documentation/Splunk/latest/Viz/DrilldownIntro)

---

*Document generated from source analysis - Last updated: [Current Date]*
