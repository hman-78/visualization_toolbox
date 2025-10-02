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

let tmpLocaleOption = 'en-GB';
if (typeof window._i18n_locale !== 'undefined' && typeof window._i18n_locale.locale_name !== 'undefined') {
  tmpLocaleOption = window._i18n_locale.locale_name.replace('_', '-');
}

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
  },
  isValidUnixTimestamp: function (strTimestamp) {
    // Check if the value is a number
    if (typeof strTimestamp === 'string') {
      strTimestamp = parseInt(strTimestamp, 10);
    }
    if (typeof strTimestamp !== 'number') {
      return false;
    }

    // Check if timestamp is finite (not NaN, Infinity, or -Infinity)
    if (!Number.isFinite(strTimestamp)) {
      return false;
    }

    // Check if the number is a positive integer
    if (!Number.isInteger(strTimestamp) || strTimestamp < 0) {
      return false;
    }

    // Check if the timestamp is within a reasonable range
    // Earliest = Unix epoch start = 0 => 1970-01-01, Latest: 2038-01-19 (for 32-bit systems)
    const minTimestamp = 0; // 1970-01-01
    const maxTimestamp = 2147483647000; // 2038-01-19
    if (strTimestamp < minTimestamp || strTimestamp > maxTimestamp) {
      return false;
    }

    // Last check: try to create a valid Date object
    const tmpDate = new Date(strTimestamp);
    if (isNaN(tmpDate.getTime())) {
      return false;
    }

    return true;
  },
  convertUnixTimestamp: function (strTimestamp) {
    if (_sharedFunctions.isValidUnixTimestamp(strTimestamp))
      return parseInt(strTimestamp);
  },
  extractDate: function (strTimestamp) {
    strTimestamp = _sharedFunctions.convertUnixTimestamp(strTimestamp);
    const date = new Date(strTimestamp);
    const formatter = new Intl.DateTimeFormat(tmpLocaleOption, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(date);
  },
  extractTime: function (strTimestamp) {
    strTimestamp = _sharedFunctions.convertUnixTimestamp(strTimestamp);
    const date = new Date(strTimestamp);
    const formatter = new Intl.DateTimeFormat(tmpLocaleOption, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: tmpLocaleOption.toLowerCase() === 'en-us' ? true : false,
    });
    return formatter.format(date);
  },
  // Function to generate a color palette dynamically
  generateColorPalette(numColors) {
    const splunkCategoricalColors = ["#006d9c", "#4fa484", "#ec9960", "#af575a", "#b6c75a", "#62b3b2", "#294e70", "#738795", "#edd051", "#bd9872", "#5a4575", "#7ea77b", "#708794", "#d7c6b7", "#339bb2", "#55672d", "#e6e1ae", "#96907f", "#87bc65", "#cf7e60", "#7b5547", "#77d6d8", "#4a7f2c", "#f589ad", "#6a2c5d", "#aaabae", "#9a7438", "#a4d563", "#7672a4", "#184b81", "#7fb6ce", "#a7d2c2", "#f6ccb0", "#d7abad", "#dbe3ad", "#b1d9d9", "#94a7b8", "#b9c3ca", "#f6e8a8", "#deccb9", "#b7acca", "#b2cab0", "#a5b2bf", "#e9ddd4", "#66c3d0", "#aab396", "#f3f0d7", "#c1bcb3", "#b6d7a3", "#e1b2a1", "#dec4ba", "#abe6e8", "#91b282", "#f8b7ce", "#cba3c2", "#cccdce", "#c3ab89", "#c7e6a3", "#ada9c8", "#a4bbe0"];
    const colors = [];
    for (let i = 0; i < numColors; i++) {
      let tmpIdx = i % splunkCategoricalColors.length;
      colors.push(splunkCategoricalColors[tmpIdx]);
    }
    return colors;
  },
  isValidInteger(value) {
    // Check for null, undefined, empty string, or boolean
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
      return false;
    }

    // Convert to number and check if it's an integer
    const num = Number(value);

    // Check if conversion resulted in NaN or if it's not an integer
    if (isNaN(num) || !Number.isInteger(num)) {
      return false;
    }

    // Additional check for string inputs that might have leading/trailing spaces
    // or other edge cases like "123.0" which technically converts to integer 123
    if (typeof value === 'string') {
      // Remove leading/trailing whitespace and check if it matches the number
      const trimmed = value.trim();
      if (trimmed === '' || trimmed !== num.toString()) {
        // Allow "123.0" to pass as valid integer
        if (!/^-?\d+\.?0*$/.test(trimmed)) {
          return false;
        }
      }
    }

    return true;
  },
  /**
   * Checks if a string is a valid color code in hex, rgb, rgba, or hsl format.
   *
   * @param {string} colorCode The string to check.
   * @returns {boolean} True if the string is a valid color code, otherwise false.
   */
  isColorCode(colorCode) {
    if (!colorCode) {
      return false;
    }
    // Regular expression for Hex colors (3 or 6 digits, with or without a leading #)
    const hexRegex = /^#?([0-9a-fA-F]{3}){1,2}$/;

    // Regular expression for RGB or RGBA colors
    const rgbRegex = /^rgba?\((\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*)(,\s*(0|1|0?\.\d+)\s*)?\)$/i;

    // Regular expression for HSL colors
    const hslRegex = /^hsl\((\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*)\)$/i;

    // Remove any leading or trailing whitespace and convert to lowercase for consistent checking.
    const cleanColor = colorCode.trim().toLowerCase();

    // Check for Hex format
    if (hexRegex.test(cleanColor)) {
      return true;
    }

    // Check for RGB or RGBA format
    if (rgbRegex.test(cleanColor)) {
      return true;
    }

    // Check for HSL format
    if (hslRegex.test(cleanColor)) {
      return true;
    }

    // If none of the above patterns match, it's not a valid color code.
    return false;
  },
  /**
   * Replaces specified properties of objects in a data array with values from a template object.
   *
   * @param {Array<Object>} dataArray - The array of objects to update.
   * @param {Object} template - The object providing replacement values for specified keys.
   * @param {Array<string>} keys - The list of property names to replace in each object.
   */
  replacePropertiesFromTemplate(dataArray, template, keys) {
    // Iterate through each object in the data array
    dataArray.forEach(item => {
      keys.forEach(key => {
        // Only replace the property if it exists in the template object
        if (Object.prototype.hasOwnProperty.call(template, key)) {
          item[key] = template[key]; // Replace the property with the template's value
        }
      });
    });
  },
  getHourlyIntervals(startTimestamp, endTimestamp) {
    let labels = [];
    const oneHour = 60 * 60 * 1000; // milliseconds in an hour
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // Round down to the nearest hour
    const startTimeRounded = Math.floor(startTimestamp / oneHour) * oneHour;
    let currentTimestamp = startTimeRounded;

    while (currentTimestamp < endTimestamp) {
      const date = new Date(currentTimestamp);
      const year = date.getFullYear();
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

      let label = '';
      const twelveHourDisplay = tmpLocaleOption.toLowerCase() === 'en-us' ? true: false;

      // Check if timestamp is from a different year
      if (year !== currentYear) {
        const dateString = date.toLocaleDateString(tmpLocaleOption, {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit'
        });
        const timeString = date.toLocaleTimeString(tmpLocaleOption, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: twelveHourDisplay
        });
        label = `${dateString} ${timeString}`;
      }
      // Check if timestamp is from current year but different day
      else if (dayStart !== currentDay) {
        const dateString = date.toLocaleDateString(tmpLocaleOption, {
          month: '2-digit',
          day: '2-digit'
        });
        const timeString = date.toLocaleTimeString(tmpLocaleOption, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: twelveHourDisplay
        });
        label = `${dateString} ${timeString}`;
      }
      // Timestamp is from current day
      else {
        label = date.toLocaleTimeString(tmpLocaleOption, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: twelveHourDisplay
        });
      }

      labels.push(label);
      currentTimestamp += oneHour;
    }
    return labels;
  },
  parseSplunkRelativeTime(expr, now = Date.now()) {
    if (typeof expr === 'undefined'|| expr === "now") {
      return now; // Return current timestamp
    }

    // 🔹 Handle raw epoch timestamps (integer or float)
    if (/^\d+(\.\d+)?$/.test(expr)) {
      let num = parseFloat(expr);
      // If it's seconds (10-digit typical), convert to ms
      if (num < 1e12) {
        num *= 1000;
      }
      return Math.floor(num);
    }

    function snap(date, unit, arg) {
      let d = new Date(date);

      switch (unit) {
        case "s":
          d.setMilliseconds(0);
          break;
        case "m":
          d.setSeconds(0, 0);
          break;
        case "h":
          d.setMinutes(0, 0, 0);
          break;
        case "d":
          d.setHours(0, 0, 0, 0);
          break;
        case "w": {
          // Locale-aware start of week
          const dow = d.getDay(); // 0 = Sunday, 1 = Monday ...
          let startDow;
          if (arg != null) {
            startDow = arg; // explicit @w0, @w1, etc.
          } else {
            // Infer from locale: US = Sunday (0), most EU = Monday (1)
            const firstDayGuess = new Intl.Locale(tmpLocaleOption).weekInfo?.firstDay ?? "mon";
            startDow = firstDayGuess === "sun" ? 0 : 1;
          }
          const diff = (dow - startDow + 7) % 7;
          d.setHours(0, 0, 0, 0);
          d.setDate(d.getDate() - diff);
          break;
        }
        case "M":
          d.setDate(1);
          d.setHours(0, 0, 0, 0);
          break;
        case "q": {
          let currentMonth = d.getMonth();
          let startMonth = Math.floor(currentMonth / 3) * 3;
          d.setMonth(startMonth, 1);
          d.setHours(0, 0, 0, 0);
          break;
        }
        case "y":
          d.setMonth(0, 1);
          d.setHours(0, 0, 0, 0);
          break;
      }
      return d;
    }

    let date = new Date(now);

    // Split expression into tokens (offsets or snaps)
    const tokens = expr.match(/([+-]\d+[smhdwqMy])|(@[smhdwqMy]\d?)/g);
    if (!tokens) throw new Error("Invalid Splunk relative time: " + expr);

    for (let token of tokens) {
      if (token.startsWith("@")) {
        const snapUnit = token[1];
        const snapArg = token.length > 2 ? parseInt(token.slice(2), 10) : null;
        date = snap(date, snapUnit, snapArg);
      } else {
        const [, numStr, unit] = token.match(/^([+-]?\d+)([smhdwqMy])$/);
        const amount = parseInt(numStr, 10);

        switch (unit) {
          case "s": date.setSeconds(date.getSeconds() + amount); break;
          case "m": date.setMinutes(date.getMinutes() + amount); break;
          case "h": date.setHours(date.getHours() + amount); break;
          case "d": date.setDate(date.getDate() + amount); break;
          case "w": date.setDate(date.getDate() + amount * 7); break;
          case "M": date.setMonth(date.getMonth() + amount); break;
          case "q": date.setMonth(date.getMonth() + amount * 3); break;
          case "y": date.setFullYear(date.getFullYear() + amount); break;
          default: throw new Error("Invalid offset unit: " + unit);
        }
      }
    }

    return date.getTime(); // epoch timestamp (ms, system TZ)
  }
};

module.exports = _sharedFunctions;