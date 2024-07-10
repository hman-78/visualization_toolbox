const _createModal = function (splunk) {
  let h2 = $("<h2>").text("Add Annotation");
  let xValueSpan = $("<span>").addClass("x-value");
  let yValueSpan = $("<span>").addClass("y-value");

  let opcoContainer = $("<div>").addClass("value-container").attr("id", "opcoContainer").css("display", "none");;
  $(".modal_annotation-content").append(opcoContainer);

  let annotationSeriesName = $("<div>").addClass("annotation-series-name").attr("id", "annotationSeriesNameContainer").css("display", "none");
  $(".modal_annotation-content").append(annotationSeriesName);

  let opcoElement = $("<div>")
    .addClass("opco")
    .attr("id", "opcoContainer").css("display", "none");

  let xValueContainer = $("<div>")
    .addClass("x-value-container")
    .text("Current X Value: ")
    .append(xValueSpan)[0]; // Get the DOM element from jQuery object
  xValueContainer.id = "xValueContainer"; // Add ID to the xValueContainer element

  let xValueElement = $("<div>").attr("id", "xValue").css("display", "none");;
  let xAxisValueElement = $("<div>").attr("id", "xAxisValue").css("display", "none");;

  let yValueContainer = $("<div>")
    .addClass("y-value-container")
    .text("Current Y Value: ")
    .append(yValueSpan)[0]; // Get the DOM element from jQuery object
  yValueContainer.id = "yValueContainer"; // Add ID to the yValueContainer element
  let yValueElement = $("<div>").attr("id", "yValue").css("display", "none");;

  function clearModalData() {
    descriptionInput.val("");
    $(".modal_annotation").css("display", "none");
    document.getElementById("descriptionInput").value = "";
    document.getElementById("xValueContainer").textContent = "";
    document.getElementById("yValueContainer").textContent = "";
    $('#saveButton').attr('target_echart_id', '');
  }

  let closeSpan = $("<span>")
    .addClass("close")
    .click(clearModalData);

  let header = $("<div>")
    .addClass("write-the-discription")
    .append(closeSpan, h2, xValueContainer, yValueContainer, opcoElement, annotationSeriesName, xValueElement, xAxisValueElement, yValueElement);


  let p = $("<p>").text("Description");
  let descriptionInput = $("<input>")
    .attr("type", "text")
    .attr("placeholder", "Enter Description").attr("id", "descriptionInput").attr("autocomplete", "off").attr("class", "wide-input");


  let body = $("<div>").addClass("modal_annotation-body").append(p, descriptionInput);

  let cancelButton = $("<button>")
    .attr("id", "cancelButton")
    .text("Cancel")
    .addClass("shadow-button")
    .click(clearModalData);

  let saveButton = $("<button>")
    .attr("id", "saveButton")
    .text("Save")
    .addClass("shadow-button")
    .css({
      "background-color": "#32CD32",
      "border-color": "#32CD32"
    });

  let footer = $("<div>").addClass("modal_annotation-footer").append(cancelButton, saveButton);

  //eslint-disable-next-line
  let modal_annotationContent = $("<div>").addClass("modal_annotation-content").append(header, body, footer);

  let content = $("<div>").addClass("modal_annotation-content").append(header, body, footer);
  let modal_annotation = $("<div>")
    .addClass("modal_annotation")
    .attr("id", "myModal_annotation")
    .css("display", "none")
    .append(content);

  $("body").append(modal_annotation);

  document.getElementById("saveButton").addEventListener("click", function (splunk) {
    return function () {
      const target_echart_id = $('#saveButton').attr('target_echart_id');
      const tmpEchartElement = splunk.scopedVariables['_renderedEchartsArray'].find(o => o.id == target_echart_id)
      if(typeof tmpEchartElement === 'undefined') {
        return;
      }
      var descriptionInput = document.getElementById("descriptionInput");
      var description = descriptionInput.value;
      var xAxisValue = tmpEchartElement["xAxisValue"];
      var yValue = tmpEchartElement["yValue"];
      var msgJson = {
        "type": "annotation",
        "action": "add",
        "opco": tmpEchartElement['opco'],
        "name": tmpEchartElement['annotationSeriesName'],
        "x": tmpEchartElement['xValue'],
        "annotation": description,
        "tags": ""
      };
      splunk._sendMQTTMessage(tmpEchartElement['mqttClient'], tmpEchartElement['mqttTopic'], JSON.stringify(msgJson));
      for (let i = 0; i < tmpEchartElement['_data'].rows.length; i++) {
        var x = tmpEchartElement['_data'].rows[i][tmpEchartElement['_annotationSeriesDataIndex'][0]];
        //eslint-disable-next-line
        var y = tmpEchartElement['_data'].rows[i][tmpEchartElement['_annotationSeriesDataIndex'][1]];
        //eslint-disable-next-line
        var annotation = tmpEchartElement['_data'].rows[i][tmpEchartElement['_annotationSeriesDataIndex'][2]];

        // to avoid a refresh of the panel the annotation with the matching x value is updated with the new annoation
        if (xAxisValue == x) {
          tmpEchartElement['_data'].rows[i][tmpEchartElement['_annotationSeriesDataIndex'][2]] = description;
        }

      }
      var isAnnotationAlreadyInData = false;
      var indexToBeDeleted = null;
  
      for (let i = 0; i < tmpEchartElement['_option'].series[tmpEchartElement['_annotationSeriesIndex']].data.length; i++) {
        let obj = tmpEchartElement['_option'].series[tmpEchartElement['_annotationSeriesIndex']].data[i];
        let x = obj[0];
        if (xAxisValue == x) {
          isAnnotationAlreadyInData = true;
          if ("" == description) {
            // remove data from series
            //eslint-disable-next-line
            indexToBeDeleted = i;
            obj[2] = "";
            tmpEchartElement['_option'].series[tmpEchartElement['_annotationSeriesIndex']].data.splice(i, 1);
            // TODO remove empty data obj from array
          } else {
            // update new value
            obj[2] = description;
          }
        }

      }

      if (!isAnnotationAlreadyInData) {
        var obj = [];
        obj.push(xAxisValue);
        obj.push(yValue);
        obj.push(description);
        tmpEchartElement['_option'].series[tmpEchartElement['_annotationSeriesIndex']].data.push(obj);
      }
      tmpEchartElement['instanceByDom'].setOption(tmpEchartElement['_option']);

      // Hide the modal_annotation after saving
      $(".modal_annotation").css("display", "none");
      // reset description
      document.getElementById("descriptionInput").value = "";
      document.getElementById("xValueContainer").text = "";
      document.getElementById("yValueContainer").text = "";

    };
  }(splunk));

  document.getElementById("descriptionInput").addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      // Call the click listener of the saveButton when Enter key is pressed
      document.getElementById("saveButton").click();
    }
  });

  // When the user clicks anywhere outside of the modal_annotation, close it
  window.onclick = function (event) {
    var modal_annotationElement = document.getElementById("myModal_annotation");
    if (event.target == modal_annotationElement) {
      modal_annotationElement.style.display = "none";
      document.getElementById("descriptionInput").value = "";
      document.getElementById("xValueContainer").text = "";
      document.getElementById("yValueContainer").text = "";
    }
  }
}

module.exports = _createModal;