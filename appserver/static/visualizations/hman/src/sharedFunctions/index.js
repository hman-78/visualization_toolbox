const echarts = require('echarts');

// File with utility functions for shared use across components in the visualization_toolbpx application.

/**
 * extractElementsFromArray
 * Generates a new array containing elements from the `arrayToProcess` array at the positions specified by `indicesArray`.
 * 
 * @param {Array} arrayToProcess - The array of elements to select from.
 * @param {Array<number>} indicesArray - An array of indicesArray specifying which elements to extract from `arrayToProcess`.
 * @returns {Array} - A new array containing the elements of `arrayToProcess` at the valid indicesArray in `indicesArray`.
 * 
 * The function performs the following steps:
 * 1. Filters the `indicesArray` array to include only indicesArray that are valid (non-negative and within the bounds of `arrayToProcess`).
 * 2. Maps the valid indicesArray to their corresponding elements in the `arrayToProcess` array.
 * 
 * Example Usage:
 * ```javascript
 * const arrayToProcess = ['a', 'b', 'c', 'd'];
 * const indicesArray = [1, 3, -1, 4, 2];
 * 
 * const result = generateSeriesData(arrayToProcess, indicesArray);
 * console.log(result); // Output: ['b', 'd', 'c']
 * ```
 */

const _sharedFunctions = {
  // Step 1: Filter the `indicesArray` array to include only valid indicesArray.
  // Valid indicesArray are non-negative and less than the length of `arrayToProcess`.
  extractElementsFromArray: function(arrayToProcess, indicesArray) {
    return indicesArray
      .filter(index => index >= 0 && index < arrayToProcess.length)
      // Step 2: Map the valid indicesArray to their corresponding elements in the `arrayToProcess` array.
      .map(index => arrayToProcess[index]);
  },
  extractObjectFromString: function(str) {
    // Match everything inside the outermost curly braces
    const match = str.match(/option\s*=\s*(\{[\s\S]*\});?/);
    if (match) {
      // Parse the extracted string into a JavaScript object
      return eval(`(${match[1]})`);
    }
    throw new Error("Invalid option input string. Check the dashboard source configuration!");
  },
  hasDynamicSeries: function(str) {
    try {
      // Split the string input into segments by commas
      const segments = str.split(',');
      if (segments.length === 0) {
          throw new Error("Wrong configuration - string input cannot be split into segments by commas!");
      }
      // Regex to detect patterns like "5*," "[5;5*;0]" or any wildcard prefixed by an integer
      const dynamicRangeRegex = /^\d+\*$/;
      const wildcardTupleRegex = /^\[\d+(;\d+\*?)*\]$/;
      // Check if any segment matches the patterns
      const hasDynamicRangeOrWildcard = segments.some(segment => 
          dynamicRangeRegex.test(segment) || wildcardTupleRegex.test(segment)
      );
      return hasDynamicRangeOrWildcard;
    } catch (error) {
        console.error("Error:", error.message);
        throw error; // Rethrow the error for handling elsewhere if needed
    }
  },
  hasValidConfiguration: function(str) {
    if(typeof str === 'undefined' || str === '') {
      return true;
    }
    // Regular expression to match the correct pattern: numbers or tuples separated by commas
    const validPattern = /^(?:\d+|\[\d+(?:;\d+)*\])(, *(?:\d+|\[\d+(?:;\d+)*\]))*$/;

    // Test the input against the pattern
    return validPattern.test(str);
  }
};

module.exports = _sharedFunctions;