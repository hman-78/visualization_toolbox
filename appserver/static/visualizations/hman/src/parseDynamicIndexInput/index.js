/**
* Explanation:
* 
* Input Parsing:
* The input string is split into segments by commas.
* Each segment is processed individually to determine its type (fixed number, tuple, or wildcard).
* 
* Fixed Numbers:
* Numbers without special characters are directly added to the output.
* 
* Tuples:
* Tuples enclosed in square brackets ([...]) are parsed.
* Elements in the tuple are checked for the * suffix (indicating dynamic ranges).
* For each dynamic element, a range of values (+1 per iteration) is generated.
* 
* Wildcard (*):
* The * wildcard generates a sequence of values starting from a predefined base.
* 
* Dynamic Range Generation:
* For dynamic elements, a range of tuples is generated, each incremented by +1 for a configurable number of iterations (rangeLimit). 
*/

function generateCombinations(input, maxValue) {
    // Parse the input to identify fixed and dynamic values
    const dynamicPositions = [];
    const fixedValues = [];

    input.forEach((value, index) => {
        if (String(value).includes('*')) {
            dynamicPositions.push(index);
        } else {
            fixedValues.push({ index, value });
        }
    });

    const result = [];
    
    // Function to generate combinations for dynamic values
    function generateRecursive(values, idx) {
        if (idx >= dynamicPositions.length) {
            // When all dynamic values are filled, push the combination to result
            const combination = [...values];
            fixedValues.forEach(fixed => combination[fixed.index] = fixed.value);
            result.push(combination);
            return;
        }

        const currentDynamicIdx = dynamicPositions[idx];
        let startValue = parseInt(input[currentDynamicIdx]);

        for (let i = startValue; i <= maxValue; i++) {
            values[currentDynamicIdx] = i;
            generateRecursive(values, idx + 1);
        }
    }

    // Initialize values array with fixed values and placeholders for dynamic ones
    let initialValues = new Array(input.length).fill(undefined);
    generateRecursive(initialValues, 0);
    
    return result;
}

const _parseDynamicIndexInput = function (input, maxIndexNrForDataFields) {
    if(typeof maxIndexNrForDataFields === 'undefined') {
        throw `data.fields.length is undefined!`
    }
    const result = [];
    if(typeof input === 'undefined') {
        return result;
    }
    const segments = input.split(','); // Split input by commas

    if (segments.length === 0) {
        throw new Error("Wrong configuration - option seriesDataIndexBinding cannot be split into segments by commas!");
    }

    let fixedNrBase = 0;
    for (let segment of segments) {
        segment = segment.trim(); // Remove extra whitespace

        if (/^\d+$/.test(segment)) {
            // Fixed number
            const processedFixedNr = parseInt(segment, 10);
            result.push(processedFixedNr);
            if(processedFixedNr > fixedNrBase) {
                fixedNrBase = processedFixedNr
            }
        } else if (/^\[(.*?)\]$/.test(segment)) {
            // Tuple-like pattern [x;y;...] // [5;5*;0] [0;5*] [0;5*;6*]
            const tupleContent = segment.match(/^\[(.*?)\]$/)[1];
            const elements = tupleContent.split(';');
            const dynamicTupleElements = generateCombinations(elements, maxIndexNrForDataFields);
            result.push(...dynamicTupleElements);
        } else if (/^(\d+)\*$/.test(segment)) {
            // Integer with '*', expand as [n, n+1, n+2, ..., n + 3 (arbitrary extra terms)]
            const fixedNrRangeLimit = maxIndexNrForDataFields; // Adjust range limit as needed
            const startingWildcardBase = parseInt(segment.match(/^(\d+)\*$/)[1], 10);
            let tmpWildcardBase = startingWildcardBase
            for (let i = 1; i <= fixedNrRangeLimit, tmpWildcardBase <= fixedNrRangeLimit; i++) {
                let tmpFixedNr = tmpWildcardBase;
                tmpFixedNr = parseInt(tmpFixedNr, 10);
                if(tmpFixedNr <= maxIndexNrForDataFields) {
                    result.push(tmpFixedNr);
                }
                tmpWildcardBase++;
            }
        } else if (/^\*$/.test(segment)) {
            // Handle `*` wildcard
            throw `Wildcard * must be prefixed by an integer! Please correct the seriesDataIndexBinding definition!`;
        }
    }

    return result;
}

module.exports = _parseDynamicIndexInput;