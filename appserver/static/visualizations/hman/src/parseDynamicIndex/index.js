// creates a json object which includes all information relevant for dynamic index processing
// object includes:
// indices: array of all indices provided, except for the dynamic index, strcuturally equal to what parseIndex returns
// startIndex: index which serves as the starting point for dynamic series generation
// fixedCount: length of the indices array
const _parseDynamicIndex = function (str) {
    var seriesDataIndex = { indices: [], startIndex: null, fixedCount: null };
    var parts = str.split('*'); // seperate dynamic index from the rest

    // remove trailing comma
    if (parts[0].slice(-1) === ',') {
        parts[0] = parts[0].slice(0, -1);
    }

    // if parts have more than one entry, dynamic index exists
    if (parts.length > 1) {
        if (isNaN(parts[1])) {
            if (parts[1].includes(',')) {
                throw 'Dynamic start index (indicated by *<index>) needs to be the last index.'
            } else {
                throw 'Dynamic start index [' + parts[1] + '] is not allowed. Please make sure it is a valid number.'
            }
        }
        seriesDataIndex.startIndex = parts[1]
    } else {
        // if not, set to -1 which indicates that no dynamic start index exists
        seriesDataIndex.startIndex = -1;
    }

    // use standrd index parser to format data excluding dynamic index
    seriesDataIndex.indices = this._parseIndex(parts[0]);

    // fixed count of series for easier indices length access
    seriesDataIndex.fixedCount = seriesDataIndex.indices.length;

    return seriesDataIndex;
}

module.exports = _parseDynamicIndex;