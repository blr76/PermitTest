require([
	"esri/Map",
	"esri/views/MapView",
	"esri/layers/FeatureLayer", //Load required modules
	"esri/layers/GraphicsLayer",
	"esri/geometry/geometryEngine",
	"esri/Graphic",
	"esri/widgets/Legend",
	"esri/tasks/support/Query",
	"esri/tasks/QueryTask"
], function (Map, MapView, FeatureLayer, GraphicsLayer, geometryEngine, Graphic, Legend, Query, QueryTask) {

	var permitTypeSelect = document.getElementById("permit-type");
	var expressionSign = document.getElementById("signSelect");
	var value = document.getElementById("valSelect");

	var popupTemplate = { //Defines the content of a popup window
		title: "{TYPE}",
		content: "<b>VALUE: " + "</b>{VALUE}" 
	};

	var smPermits = new FeatureLayer({
		url: "https://services9.arcgis.com/7Qlag1okkCS2m4YF/ArcGIS/rest/services/SMPermitTest/FeatureServer/0",
		outFields: ["*"],
		visible: true
	});

	var resultsLayer = new GraphicsLayer();

	var qTask = new QueryTask({ //The data the query will be run against
		url: "https://services9.arcgis.com/7Qlag1okkCS2m4YF/ArcGIS/rest/services/SMPermitTest/FeatureServer/0"
	});
	var params = new Query({ //Query parameters, Geometry and all attributes
		returnGeometry: true,
		outFields: ["*"]
	});

	var map = new Map({
		basemap: "dark-gray",
		layers: [smPermits]
	});

	var view = new MapView({
		container: "viewDiv",
		map: map,
		center: [-97.94, 29.88],
		zoom: 13
	});

	var legend = new Legend({
		view: view,
		layerInfos: [{
			layer: smPermits,
			title: "Permit Class"
		}]
	});


	view.ui.add(legend, "bottom-right");
	view.ui.add("infoDiv", "top-right");

	function doQuery() { //Execute query function
		resultsLayer.removeAll(); //Remove previous query results
		params.where = "VALUE" + expressionSign.value + value.value; //Construct query
		qTask.execute(params).then(getResults).catch(promiseRejected);
		//execute query, recieve results, catch errors
	}

	function getResults(response) { //Process results from query
		var permitResults = response.features.map(function (feature) { //List results in popup
			feature.popupTemplate = popupTemplate;
			return feature;
		});
		resultsLayer.addMany(permitResults);

		view.goTo(permitResults).then(function () { //dynamic/interactive popups, animation
			view.popup.open({
				features: permitResults,
				featureMenuOpen: true,
				updateLocationEnabled: true
			});
		});

	}
	// query all features from the permits layer
	view.when(function () {
			document.getElementById("doBtn").addEventListener("click", doQuery);
			return smPermits.when(function () {
				var query = smPermits.createQuery();
				return smPermits.queryFeatures(query);
			});
		})
		.then(getValues)
		.then(getUniqueValues)
		.then(addToSelect);

	// return an array of all the values
	function getValues(response) {
		var features = response.features;
		var values = features.map(function (feature) {
			return feature.attributes.TYPE;
		});

		return values;
	}

	// return an array of unique values
	function getUniqueValues(values) {
		var uniqueValues = [];

		values.forEach(function (item, i) {
			if ((uniqueValues.length < 1 || uniqueValues.indexOf(item) === -1) &&
				(item !== "")) {
				uniqueValues.push(item);
			}
		});
		return uniqueValues;
	}


	// Add the unique values to the permits type
	// select element. This will allow the user
	// to filter permits by type.
	function addToSelect(values) {

		values.sort();
		values.forEach(function (value) {
			var option = document.createElement("option");
			option.text = value;
			permitTypeSelect.add(option);
		});

		return setpermitsDefinitionExpression(permitTypeSelect.value);
	}

	function setpermitsDefinitionExpression(newValue) {
		smPermits.definitionExpression = "TYPE = '" + newValue + "'";

		if (!smPermits.visible) {
			smPermits.visible = true;
		}
	}


	permitTypeSelect.addEventListener("change", function () {
		var type = permitTypeSelect.options[permitTypeSelect.selectedIndex].text;
		setpermitsDefinitionExpression(type);
	});

	function promiseRejected(error) { //Catch and display 'promise' errors
		console.error("Promise rejected: ", error.message);
	}

});
