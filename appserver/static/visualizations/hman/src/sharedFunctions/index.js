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
 * 
 * hasValidConfiguration
 * Method in charge of validating configSeriesDataIndexBinding string
 * How is working?
 * 1. Segments Parsing: The input is split into individual segments by commas.
 * Validation Rules:
 * A segment can be:
 * A tuple like [5;6] or [5;6*].
 * A wildcard integer like 5*.
 * A plain integer like 5.
 * Each segment is checked against these rules using regular expressions.
 * Constraints:
 * Only one tuple is allowed to include a wildcard (*).
 * No more than one tuple and no more than one wildcard integer are allowed.
 * Segments with invalid syntax or disallowed combinations (e.g., [0;2][5;6],[7;8*]) are marked as invalid.
 */

// Helper functions
const isInteger = s => /^\d+$/.test(s);
const isFixedTuple = s => /^\[\d+(;\d+)*\]$/.test(s);
const isDynamicRangeTuple = s => /^\[(\d+|\d+\*)(;(\d+|\d+\*))*\]$/.test(s);
const isWildcardInteger = s => /^\d+\*$/.test(s);

const _sharedFunctions = {
  // Step 1: Filter the `indicesArray` array to include only valid indicesArray.
  // Valid indicesArray are non-negative and less than the length of `arrayToProcess`.
  extractElementsFromArray: function (arrayToProcess, indicesArray) {
    return indicesArray
      .filter(index => index >= 0 && index < arrayToProcess.length)
      // Step 2: Map the valid indicesArray to their corresponding elements in the `arrayToProcess` array.
      .map(index => arrayToProcess[index]);
  },
  hasDynamicSeries: function (str) {
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
  hasValidConfiguration: function (input) {
    console.log('The input is ', input);
    if (typeof input === 'undefined' || input === '') {
      return true;
    }

    // Split the input by commas
    const parts = input.split(',');

    // Flags for constraints
    let hasDynamicRange = false;
    let hasWildcardInteger = false;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();

      if (isInteger(part)) {
        // Continue, integers are valid
        continue;
      } else if (isFixedTuple(part)) {
        // Fixed tuples are valid
        continue;
      } else if (isDynamicRangeTuple(part)) {
        if (hasDynamicRange) {
          // Only one dynamic range is allowed
          return false;
        }
        hasDynamicRange = true;
      } else if (isWildcardInteger(part)) {
        if (hasWildcardInteger) {
          // Only one wildcard integer is allowed
          return false;
        }
        hasWildcardInteger = true;
      } else {
        // Invalid part
        return false;
      }

      // Ensure the last part constraints
      if ((hasWildcardInteger || hasDynamicRange) && i < parts.length - 1) {
        return false;
      }
    }

    return true;
  }
};

module.exports = _sharedFunctions;