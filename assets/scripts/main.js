var drawingManager;
var selectedShape;
var colors = ["#1E90FF", "#FF1493", "#32CD32", "#FF8C00", "#4B0082"];
var selectedColor;
var colorButtons = {};
function clearSelection() {
  if (selectedShape) {
    if (typeof selectedShape.setEditable == "function") {
      selectedShape.setEditable(false);
    }
    selectedShape = null;
  }
}
// sidebar shape paths and other info display function
function updateCurSelText(shape) {
  posstr = "" + selectedShape.position;
  //posstr = posstr.replace(/\s/g, "");
  if (typeof selectedShape.position == "object") {
    posstr = selectedShape.position.toUrlValue();
  }
  //pathstr = pathstr.replace(/\s/g, ""); and create path display string
  pathstr = "" + selectedShape.getPath;
  if (typeof selectedShape.getPath == "function") {
    pathstr = "[ ";
    for (var i = 0; i < selectedShape.getPath().getLength(); i++) {
      // .toUrlValue(5) limits number of decimals, default is 6 but can do more
      pathstr +=
        "[ " + selectedShape.getPath().getAt(i).toUrlValue() + " ] " + " , ";
    }
    pathstr += "]";
  }
  bndstr = "" + selectedShape.getBounds;
  cntstr = "" + selectedShape.getBounds;
  if (typeof selectedShape.getBounds == "function") {
    var tmpbounds = selectedShape.getBounds();
    cntstr = "" + tmpbounds.getCenter().toUrlValue();
    bndstr =
      "[NE: " +
      tmpbounds.getNorthEast().toUrlValue() +
      " SW: " +
      tmpbounds.getSouthWest().toUrlValue() +
      "]";
  }
  cntrstr = "" + selectedShape.getCenter;
  if (typeof selectedShape.getCenter == "function") {
    cntrstr = "" + selectedShape.getCenter().toUrlValue();
  }
  radstr = "" + selectedShape.getRadius;
  if (typeof selectedShape.getRadius == "function") {
    radstr = "" + selectedShape.getRadius();
  }
  curseldiv.innerHTML =
    "<b>New Shape Info</b>: " +
    "<br><b>Type</b>: " +
    selectedShape.type +
    " " +
    "<br> <b>Coordinates</b>: " +
    pathstr;
  /*           " ; <i>bounds</i>: " +
          bndstr +
          " ; <i>Cb</i>: " +
          cntstr +
          " ; <i>radius</i>: " +
          radstr +
          " ; <i>Cr</i>: " +
          cntrstr; */
}
function setSelection(shape, isNotMarker) {
  clearSelection();
  selectedShape = shape;
  if (isNotMarker) shape.setEditable(true);
  selectColor(shape.get("fillColor") || shape.get("strokeColor"));
  updateCurSelText(shape);
}
function deleteSelectedShape() {
  if (selectedShape) {
    selectedShape.setMap(null);
  }
}
function selectColor(color) {
  selectedColor = color;
  for (var i = 0; i < colors.length; ++i) {
    var currColor = colors[i];
    colorButtons[currColor].style.border =
      currColor == color ? "2px solid #789" : "2px solid #fff";
  }
  // Retrieves the current options from the drawing manager and replaces the
  // stroke or fill color as appropriate.
  var polylineOptions = drawingManager.get("polylineOptions");
  polylineOptions.strokeColor = color;
  drawingManager.set("polylineOptions", polylineOptions);
  var rectangleOptions = drawingManager.get("rectangleOptions");
  rectangleOptions.fillColor = color;
  drawingManager.set("rectangleOptions", rectangleOptions);
  var circleOptions = drawingManager.get("circleOptions");
  circleOptions.fillColor = color;
  drawingManager.set("circleOptions", circleOptions);
  var polygonOptions = drawingManager.get("polygonOptions");
  polygonOptions.fillColor = color;
  drawingManager.set("polygonOptions", polygonOptions);
}
function setSelectedShapeColor(color) {
  if (selectedShape) {
    if (selectedShape.type == google.maps.drawing.OverlayType.POLYLINE) {
      selectedShape.set("strokeColor", color);
    } else {
      selectedShape.set("fillColor", color);
    }
  }
}
// colors for the polygon, set the line color to white with an opacity of 0.8
function makeColorButton(color) {
  var button = document.createElement("span");
  button.className = "color-button";
  button.style.backgroundColor = color;
  google.maps.event.addDomListener(button, "click", function () {
    selectColor(color);
    setSelectedShapeColor(color);
  });
  return button;
}
// color picker
function buildColorPalette() {
  var colorPalette = document.getElementById("color-palette");
  for (var i = 0; i < colors.length; ++i) {
    var currColor = colors[i];
    var colorButton = makeColorButton(currColor);
    colorPalette.appendChild(colorButton);
    colorButtons[currColor] = colorButton;
  }
  selectColor(colors[0]);
}
/////////////////////////////////////
var map; //= new google.maps.Map(document.getElementById('map'), {
// these must have global refs too!:
var placeMarkers = [];
var input;
var searchBox;
var curposdiv;
var curseldiv;
var currentdiv;
function deletePlacesSearchResults() {
  for (var i = 0, marker; (marker = placeMarkers[i]); i++) {
    marker.setMap(null);
  }
  placeMarkers = [];
  input.value = ""; // clear the box too
}

function initialize() {
  map = new google.maps.Map(document.getElementById("map"), {
    // we are setting the map properties here (zoom, center, controls, etc)
    zoom: 16, // 16 to get 100m to 1cm of screen to match architectural scale,
    center: new google.maps.LatLng(41.805594, -73.340621) /* 41.804666,
      -73.340428 */,
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: true,
    scaleControl: true,
    streetViewControl: true,
    rotateControl: true,
    fullscreenControl: true,
    mapTypeControlOptions: {
      style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
      position: google.maps.ControlPosition.TOP_RIGHT,
    },
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP,
    },
    scaleControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP,
    },
    streetViewControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP,
    },
    rotateControlOptions: {
      position: google.maps.ControlPosition.LEFT_BOTTOM,
    },
    fullscreenControlOptions: {
      position: google.maps.ControlPosition.RIGHT_TOP,
    },
  });
  curposdiv = document.getElementById("curpos");
  curseldiv = document.getElementById("cursel");
  currentdiv = document.getElementById("current");
  var polyOptions = {
    strokeWeight: 0,
    fillOpacity: 0.45,
    editable: true,
    draggable: true,
  };
  // Pre-define the polygon, rectangle, circle, and marker options.
  var propertyArea = [
    [41.812048, -73.336029],
    [41.811872, -73.335042],
    [41.811568, -73.335042],
    [41.811408, -73.334441],
    [41.810896, -73.33487],
    [41.810816, -73.33472],
    [41.809841, -73.334806],
    [41.809121, -73.334183],
    [41.808785, -73.33502],
    [41.808545, -73.334334],
    [41.808385, -73.334913],
    [41.806626, -73.336115],
    [41.80621, -73.336608],
    [41.805634, -73.3356],
    [41.805154, -73.335922],
    [41.804754, -73.336394],
    [41.804083, -73.337016],
    [41.803843, -73.33723],
    [41.803731, -73.33766],
    [41.803603, -73.33796],
    [41.803427, -73.338282],
    [41.803027, -73.338733],
    [41.802803, -73.339247],
    [41.802003, -73.340063],
    [41.801683, -73.34032],
    [41.802387, -73.3409],
    [41.803651, -73.340127],
    [41.804946, -73.34075],
    [41.805682, -73.340084],
    [41.805794, -73.340556],
    [41.805986, -73.340428],
    [41.806178, -73.340299],
    [41.806802, -73.339848],
    [41.80709, -73.339827],
    [41.807873, -73.339591],
    [41.808017, -73.339011],
    [41.808353, -73.338604],
    [41.808625, -73.338389],
    [41.808785, -73.338282],
    [41.809073, -73.33811],
    [41.809345, -73.337917],
    [41.809457, -73.337681],
    [41.809601, -73.337531],
    [41.809873, -73.337295],
    [41.810177, -73.337102],
    [41.810368, -73.33693],
    [41.810672, -73.336737],
    [41.810944, -73.336651],
    [41.81136, -73.336179],
  ];
  var points = [];
  // Construct the polygon.
  for (var i = 0; i < propertyArea.length; i++) {
    points.push({
      lat: propertyArea[i][0],
      lng: propertyArea[i][1],
    });
  }
  // Set the polygon's editable properties
  var parcelA = new google.maps.Polygon({
    paths: points,
    draggable: true,
    editable: true,
    strokeColor: "#005aff",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#005aff",
  });
  // Set the polygon to the map
  parcelA.setMap(map);
  // Second polygon
  var propertyArea2 = [
    [41.802387, -73.340943],
    [41.801667, -73.340321],
    [41.801539, -73.340342],
    [41.801475, -73.340063],
    [41.801331, -73.340042],
    [41.801187, -73.340342],
    [41.801043, -73.340407],
    [41.800947, -73.340192],
    [41.800915, -73.339977],
    [41.800755, -73.339892],
    [41.800627, -73.340042],
    [41.800483, -73.340149],
    [41.800371, -73.33987],
    [41.800179, -73.339484],
    [41.799971, -73.339226],
    [41.798548, -73.343904],
    [41.799795, -73.34472],
    [41.800963, -73.34414],
    [41.801331, -73.344119],
    [41.801539, -73.344097],
    [41.801747, -73.344054],
    [41.801859, -73.344097],
    [41.801955, -73.344484],
    [41.802083, -73.344677],
    [41.802275, -73.345256],
    [41.802483, -73.345685],
    [41.802755, -73.34532],
    [41.802867, -73.345256],
    [41.802867, -73.342424],
    [41.802723, -73.34193],
  ];
  var points2 = [];
  // Construct the polygon.
  for (var i = 0; i < propertyArea2.length; i++) {
    points2.push({
      lat: propertyArea2[i][0],
      lng: propertyArea2[i][1],
    });
  }
  // Set the polygon's editable properties
  var parcelB = new google.maps.Polygon({
    paths: points2,
    draggable: true,
    editable: true,
    strokeColor: "yellow",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "yellow",
  });
  // Set the polygon to the map
  parcelB.setMap(map);
  // Loop through all paths in the polygon and add listeners
  // to them. If we just used `getPath()` then we wouldn't
  // detect all changes to shapes like donuts.

  // Abstract the coordinates and update the text area
  updateCurrentDiv = (parcel) => {
    setTimeout(() => {
      let parcelPaths = parcel
        .getPaths()
        .getArray()
        .map((path) => {
          return path.getArray().map((latLng) => {
            return [latLng.lat(), latLng.lng()];
          });
        });
      currentdiv.innerHTML =
        "<br><b>Current Shape Coordinates:</b> <br>" +
        JSON.stringify(parcelPaths);
    }, 100);
  };

  // Reusable function to add listeners to a path

  var parcelEventHandler = (parcelX) => {
    parcelX.getPaths().forEach(function (path, index) {
      google.maps.event.addListener(path, "click", function () {
        updateCurrentDiv(parcelX);
      });

      google.maps.event.addListener(path, "remove_at", function () {
        updateCurrentDiv(parcelX);
      });

      google.maps.event.addListener(path, "insert_at", function () {
        updateCurrentDiv(parcelX);
      });

      google.maps.event.addListener(path, "set_at", function () {
        updateCurrentDiv(parcelX);
      });
    });
    google.maps.event.addListener(parcelX, "dragend", function () {
      updateCurrentDiv(parcelX);
    });
  };

  // Start the listeners on the parcels
  parcelEventHandler(parcelA);
  parcelEventHandler(parcelB);

  // Second polygon end here
  // Creates a drawing manager attached to the map that allows the user to draw
  // markers, lines, and shapes.
  drawingManager = new google.maps.drawing.DrawingManager({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    markerOptions: {
      draggable: true,
      editable: true,
    },
    polylineOptions: {
      editable: true,
    },
    rectangleOptions: polyOptions,
    circleOptions: polyOptions,
    polygonOptions: polyOptions,
    map: map,
  });
  google.maps.event.addListener(
    drawingManager,
    "overlaycomplete",
    function (event) {
      if (event.type != google.maps.drawing.OverlayType.MARKER) {
        // Switch back to non-drawing mode after drawing a shape.
        drawingManager.setDrawingMode(null);
        // Add an event listener that selects the newly-drawn shape when the user
        // mouses down on it.
        var newShape = event.overlay;
        newShape.type = event.type;
        google.maps.event.addListener(newShape, "click", function () {
          setSelection(newShape);
        });
        setSelection(newShape);
      }
    }
  );

  // Add an event listener that selects the newly-drawn shape when the user finishes drawing.
  google.maps.event.addListener(
    drawingManager,
    "overlaycomplete",
    function (e) {
      //~ if (e.type != google.maps.drawing.OverlayType.MARKER) {
      var isNotMarker = e.type != google.maps.drawing.OverlayType.MARKER;
      // Switch back to non-drawing mode after drawing a shape.
      drawingManager.setDrawingMode(null);
      // Add an event listener that selects the newly-drawn shape when the user
      // mouses down on it.
      var newShape = e.overlay;
      newShape.type = e.type;

      google.maps.event.addListener(newShape, "click", function () {
        setSelection(newShape, isNotMarker);
      });
      google.maps.event.addListener(newShape, "drag", function () {
        updateCurSelText(newShape);
      });
      google.maps.event.addListener(newShape, "dragend", function () {
        updateCurSelText(newShape);
      });

      setSelection(newShape, isNotMarker);
      //~ }// end if
    }
  );
  // Clear the current selection when the drawing mode is changed, or when the
  // map is clicked.
  google.maps.event.addListener(
    drawingManager,
    "drawingmode_changed",
    clearSelection
  );
  google.maps.event.addListener(map, "click", clearSelection);
  google.maps.event.addDomListener(
    document.getElementById("delete-button"),
    "click",
    deleteSelectedShape
  );
  buildColorPalette();
  //~ initSearch();
  // Create the search box and link it to the UI element.
  input = /** @type {HTMLInputElement} */ (
    //var
    document.getElementById("pac-input")
  );
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(input);
  //
  var DelPlcButDiv = document.createElement("div");
  DelPlcButDiv.classList.add("del-search");
  //~ DelPlcButDiv.style.color = 'rgb(25,25,25)'; // no effect?
  DelPlcButDiv.innerHTML = "CLEAR";
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(DelPlcButDiv);
  google.maps.event.addDomListener(
    DelPlcButDiv,
    "click",
    deletePlacesSearchResults
  );
  searchBox = new google.maps.places.SearchBox( //var
    /** @type {HTMLInputElement} */ (input)
  );
  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, "places_changed", function () {
    var places = searchBox.getPlaces();
    if (places.length == 0) {
      return;
    }
    for (var i = 0, marker; (marker = placeMarkers[i]); i++) {
      marker.setMap(null);
    }
    // For each place, get the icon, place name, and location.
    placeMarkers = [];
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0, place; (place = places[i]); i++) {
      var image = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25),
      };
      // Create a marker for each place.
      var marker = new google.maps.Marker({
        map: map,
        icon: image,
        title: place.name,
        position: place.geometry.location,
      });
      placeMarkers.push(marker);
      bounds.extend(place.geometry.location);
    }
    map.fitBounds(bounds);
  });
  // Bias the SearchBox results towards places that are within the bounds of the
  // current map's viewport.
  google.maps.event.addListener(map, "bounds_changed", function () {
    var bounds = map.getBounds();
    searchBox.setBounds(bounds);
    curposdiv.innerHTML =
      "<br><b>INFO </b> <br> <b>Zoom:</b> " +
      map.getZoom() +
      " <b><br>Center Coordinate:</b> " +
      map.getCenter().toUrlValue();
  }); //////////////////////
} // end initMap

google.maps.event.addDomListener(window, "load", initialize);
// [END region_initialize]
// [START region_data]
