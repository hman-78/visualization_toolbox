const _createModal = function (splunk) {
  var h2 = $("<h2>").text("Add Annotation");
  var xValueSpan = $("<span>").addClass("x-value");
  var yValueSpan = $("<span>").addClass("y-value");
  //eslint-disable-next-line
  var modal_annotationContent = $("<div>").addClass("modal_annotation-content").append(header, body, footer);

  var opcoContainer = $("<div>").addClass("value-container").attr("id", "opcoContainer").css("display", "none");;
  $(".modal_annotation-content").append(opcoContainer);

  var annotationSeriesName = $("<div>").addClass("annotation-series-name").attr("id", "annotationSeriesNameContainer").css("display", "none");
  $(".modal_annotation-content").append(annotationSeriesName);

  var opcoElement = $("<div>")
    .addClass("opco")
    .attr("id", "opcoContainer").css("display", "none");

  var xValueContainer = $("<div>")
    .addClass("x-value-container")
    .text("Current X Value: ")
    .append(xValueSpan)[0]; // Get the DOM element from jQuery object
  xValueContainer.id = "xValueContainer"; // Add ID to the xValueContainer element

  var xValueElement = $("<div>").attr("id", "xValue").css("display", "none");;
  var xAxisValueElement = $("<div>").attr("id", "xAxisValue").css("display", "none");;


  var yValueContainer = $("<div>")
    .addClass("y-value-container")
    .text("Current Y Value: ")
    .append(yValueSpan)[0]; // Get the DOM element from jQuery object
  yValueContainer.id = "yValueContainer"; // Add ID to the yValueContainer element
  var yValueElement = $("<div>").attr("id", "yValue").css("display", "none");;


  function clearModalData() {
    descriptionInput.val("");
    $(".modal_annotation").css("display", "none");
    document.getElementById("descriptionInput").value = "";
    document.getElementById("xValueContainer").textContent = "";
    document.getElementById("yValueContainer").textContent = "";
  }

  var closeSpan = $("<span>")
    .addClass("close")
    .click(clearModalData);

  var header = $("<div>")
    .addClass("write-the-discription")
    .append(closeSpan, h2, xValueContainer, yValueContainer, opcoElement, annotationSeriesName, xValueElement, xAxisValueElement, yValueElement);


  var p = $("<p>").text("Description");
  var descriptionInput = $("<input>")
    .attr("type", "text")
    .attr("placeholder", "Enter Description").attr("id", "descriptionInput").attr("autocomplete", "off").attr("class", "wide-input");


  var body = $("<div>").addClass("modal_annotation-body").append(p, descriptionInput);

  var cancelButton = $("<button>")
    .attr("id", "cancelButton")
    .text("Cancel")
    .addClass("shadow-button")
    .click(clearModalData);

  var saveButton = $("<button>")
    .attr("id", "saveButton")
    .text("Save")
    .addClass("shadow-button")
    .css({
      "background-color": "#32CD32",
      "border-color": "#32CD32"
    });

  var footer = $("<div>").addClass("modal_annotation-footer").append(cancelButton, saveButton);

  var content = $("<div>").addClass("modal_annotation-content").append(header, body, footer);
  var modal_annotation = $("<div>")
    .addClass("modal_annotation")
    .attr("id", "myModal_annotation")
    .css("display", "none")
    .append(content);

  $("body").append(modal_annotation);

  document.getElementById("saveButton").addEventListener("click", function (splunk) {
    return function () {
      var descriptionInput = document.getElementById("descriptionInput");
      var description = descriptionInput.value;
      var annotationSeriesName = document.getElementById("annotationSeriesNameContainer").textContent;
      var opco = document.getElementById("opcoContainer").textContent;
      var xValue = document.getElementById("xValue").textContent;
      var xAxisValue = document.getElementById("xAxisValue").textContent;
      var yValue = document.getElementById("yValue").textContent;

      var msgJson = {
        "type": "annotation",
        "action": "add",
        "opco": opco,
        "name": annotationSeriesName,
        "x": xValue,
        "annotation": description,
        "tags": ""
      };

      splunk._sendMQTTMessage(JSON.stringify(msgJson));
      for (let i = 0; i < splunk.scopedVariables['_data'].rows.length; i++) {
        var x = splunk.scopedVariables['_data'].rows[i][splunk.scopedVariables['_annotationSeriesDataIndex'][0]];
        //eslint-disable-next-line
        var y = splunk.scopedVariables['_data'].rows[i][splunk.scopedVariables['_annotationSeriesDataIndex'][1]];
        //eslint-disable-next-line
        var annotation = splunk.scopedVariables['_data'].rows[i][splunk.scopedVariables['_annotationSeriesDataIndex'][2]];

        // to avoid a refresh of the panel the annotation with the matching x value is updated with the new annoation
        if (xAxisValue == x) {
          splunk.scopedVariables['_data'].rows[i][splunk.scopedVariables['_annotationSeriesDataIndex'][2]] = description;
        }

      }
      var isAnnotationAlreadyInData = false;
      var indexToBeDeleted = null;

      for (let i = 0; i < splunk.scopedVariables['_option'].series[splunk.scopedVariables['_annotationSeriesIndex']].data.length; i++) {
        let obj = splunk.scopedVariables['_option'].series[splunk.scopedVariables['_annotationSeriesIndex']].data[i];
        let x = obj[0];
        if (xAxisValue == x) {
          isAnnotationAlreadyInData = true;
          if ("" == description) {
            // remove data from series
            //eslint-disable-next-line
            indexToBeDeleted = i;
            obj[2] = "";
            splunk.scopedVariables['_option'].series[splunk.scopedVariables['_annotationSeriesIndex']].data.splice(i, 1);
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
        splunk.scopedVariables['_option'].series[splunk.scopedVariables['_annotationSeriesIndex']].data.push(obj);
      }
      splunk.scopedVariables['_myChart'].setOption(splunk.scopedVariables['_option']);


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