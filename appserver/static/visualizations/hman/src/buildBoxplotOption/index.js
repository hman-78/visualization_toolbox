const _buildBoxplotOption = function (data, config) {
  const originalDataRows = data.rows;
  const originalDataFields = data.fields;
  console.log('Enter the boxplot option!');
  console.log(data.rows)
  console.log(`originalDataRows: ${originalDataRows}`)
  console.log(`originalDataFields: ${JSON.stringify(originalDataFields)}`)
  var configOption = config[this.getPropertyNamespaceInfo().propertyNamespace + "option"];

  var option = {};
  option = this._parseOption(configOption);
  if (option == null) {
    return null;
  }

  // initialize numbers
  var numberOfBoxplots = data.rows[0].length;
  var numberOfCategories = Number(data.rows[7][0]);
  var numberOfGroups = Number(numberOfBoxplots / numberOfCategories);
  var numberOfOutliers = 0;
  if (numberOfCategories == 1) {
    numberOfOutliers = data.rows.length - 8;
  }

  // data mapping xAxis
  option.xAxis.data = [];
  let deduplicatedXaxisData = [...new Set(data.rows[6])].sort();
  for (let i = 0; i < deduplicatedXaxisData.length; i++) {
    option.xAxis.data[i] = deduplicatedXaxisData[i];
  }

  // data mapping dynamic categories
  let deduplicatedCategories = [...new Set(data.rows[5])].sort();

  let extractedColumnsArray = [];
  for (let i = 0; i < data.rows[0].length; i++) {
    var temporaryColumn = data.rows.map(d => d[i]);
    extractedColumnsArray.push(temporaryColumn);
  }

  // initialization of series
  option.series = [];
  for(let i = 0; i < deduplicatedCategories.length; i++) {
    let tmpCategory = {
      name: deduplicatedCategories[i],
      type: 'boxplot',
      itemStyle: `rgb(${10+3*i}, ${23+5*i}, ${45+1*1})`,
      data: new Array(option.xAxis.data.length).fill([]).map(()=>new Array(option.xAxis.data.length).fill([]))
    }
    let tmpFilteredItems = extractedColumnsArray.filter(x => x[5] == deduplicatedCategories[i]);
    for (let z = 0; z < tmpFilteredItems.length; z++) {
      if(tmpFilteredItems[z][5] === deduplicatedCategories[i]) {
        const tmpNameIdx = option.xAxis.data.findIndex(el => el == tmpFilteredItems[z][6]);
        if (tmpNameIdx >= 0) {
          tmpCategory.data[tmpNameIdx] = [
            tmpFilteredItems[z][0],
            tmpFilteredItems[z][1],
            tmpFilteredItems[z][2],
            tmpFilteredItems[z][3],
            tmpFilteredItems[z][4]
          ]
        }
      }
    }
    option.series.push(tmpCategory);
  }

  if (numberOfCategories == 1) {
    //make first series looking nice 
    option.series[0]["itemStyle"] = {};
    option.series[0].itemStyle["borderColor"] = 'rgb(0, 126, 185)';
  }

  // map data of outliers
  if (numberOfOutliers > 0) {
    var serie = {};
    serie["name"] = 'Outlier';
    serie["type"] = 'scatter';
    serie["data"] = [];
    for (let i = 0; i < numberOfOutliers; i++) {
      for (let j = 0; j < numberOfGroups; j++) {
        var dataValue = data.rows[i + 8][j];
        if ("'-'" != dataValue) {
          var oData = [];
          oData.push(data.rows[6][j]);
          oData.push(dataValue);
          serie.data.push(oData);
        }
      }
    }
    option.series.push(serie);
  }
  return option;
}

module.exports = _buildBoxplotOption;