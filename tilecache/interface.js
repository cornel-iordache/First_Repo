/*global jQuery: false, GeometryControls: false, PolygonControl: false, document: false, GMap2: false, GLatLng: false, console: true, GBrowserIsCompatible: false, Highcharts: false, OpenLayers: false */
var calcref = {};

// This is Lucky.
var labels = [];
labels[1] = {'label': "Low", 'color': '#FFFFB2'};
labels[2] = {'label': "Medium-Low", 'color': '#FECC5C'};
labels[3] = {'label': "Medium", 'color': '#FD8D3C'};
labels[4] = {'label': "Medium-High", 'color': '#F03B20'};
labels[5] = {'label': "High", 'color': '#BD0026'};

// Apparently these are not used.
labels[6] = {'label': "Risk Level 6", 'color': '#B38438'};
labels[7] = {'label': "Risk Level 7", 'color': '#C66B33'};
labels[8] = {'label': "Risk Level 8", 'color': '#D9532D'};
labels[9] = {'label': "Risk Level 9", 'color': '#FF2222'};

labels[11] = {'label': "Post-flooding or irrigated croplands (or aquatic)", 'color': "#AAF0F0"};
labels[14] = {'label': "Rainfed croplands", 'color': "#FFFF64"};
labels[20] = {'label': "Mosaic cropland (50-70%) / vegetation (grassland/shrubland/forest) (20-50%)", 'color': "#DCF064"};
labels[30] = {'label': "Mosaic vegetation (grassland/shrubland/forest) (50-70%) / cropland (20-50%)", 'color': "#CDCD66"};
labels[40] = {'label': "Closed to open (>15%) broadleaved evergreen or semi-deciduous forest (>5m)", 'color': "#006400"};
labels[50] = {'label': "Closed (>40%) broadleaved deciduous forest (>5m)", 'color': "#00A000"};
labels[60] = {'label': "Open (15-40%) broadleaved deciduous forest/woodland (>5m)", 'color': "#AAC800"};
labels[70] = {'label': "Closed (>40%) needleleaved evergreen forest (>5m)", 'color': "#003C00"};
labels[90] = {'label': "Open (15-40%) needleleaved deciduous or evergreen forest (>5m)", 'color': "#286400"};
labels[100] = {'label': "Closed to open (>15%) mixed broadleaved and needleleaved forest (>5m)", 'color': "#788200"};
labels[110] = {'label': "Mosaic forest or shrubland (50-70%) / grassland (20-50%)", 'color': "#8CA000"};
labels[120] = {'label': "Mosaic grassland (50-70%) / forest or shrubland (20-50%)", 'color': "#BE9600"};
labels[130] = {'label': "Closed to open (>15%) (broadleaved or needleleaved, evergreen or deciduous) shrubland (<5m)", 'color': "#966400"};
labels[140] = {'label': "Closed to open (>15%) herbaceous vegetation (grassland, savannas or lichens/mosses)", 'color': "#FFB432"};
labels[150] = {'label': "Sparse (<15%) vegetation", 'color': "#FFEBAF"};
labels[160] = {'label': "Closed to open (>15%) broadleaved forest regularly flooded (semi-permanently or temporarily) - Fresh or brackish water", 'color': "#00785A"};
labels[170] = {'label': "Closed (>40%) broadleaved forest or shrubland permanently flooded - Saline or brackish water", 'color': "#009678"};
labels[180] = {'label': "Closed to open (>15%) grassland or woody vegetation on regularly flooded or waterlogged soil - Fresh, brackish or saline water", 'color': "#00DC82"};
labels[190] = {'label': "Artificial surfaces and associated areas (Urban areas >50%)", 'color': "#C31400"};
labels[200] = {'label': "Bare areas", 'color': "#FFF5D7"};
labels[210] = {'label': "Water bodies", 'color': "#0046C8"};
labels[220] = {'label': "Permanent snow and ice", 'color': "#FFFFFF"};
labels[230] = {'label': "No data (burnt areas, clouds,�)", 'color': "#000000"};

var defaultColours = [
	'#4572A7', 
	'#AA4643', 
	'#89A54E', 
	'#80699B', 
	'#3D96AE', 
	'#DB843D', 
	'#92A8CD', 
	'#A47D7C', 
	'#B5CA92'
];
		
var polygonControl;
var modifyFeatureControl;
var polygonCount = 0;
var features = [];
// 300m = 9 hectares per cell.
var hectaresPerCell = 100;

var ecometricaLayers = [
	'http://geoserver.ecometrica.org/geoserver/gwc/service/wms',
	'http://a-geoserver.ecometrica.org/geoserver/gwc/service/wms',
	'http://b-geoserver.ecometrica.org/geoserver/gwc/service/wms',
	'http://c-geoserver.ecometrica.org/geoserver/gwc/service/wms'
];

var coreLayers = [
	new OpenLayers.Layer.WMS("Satellite View", ecometricaLayers, {layers: 'Ecometrica:BlueMarble', format: 'image/jpeg'}, {'layerId': 'bluemarble'}),
	new OpenLayers.Layer.WMS("Map View", "http://labs.metacarta.com/wms/vmap0", {'layers': 'basic'}, {'layerId': 'openlayerswms'}),
	new OpenLayers.Layer.WMS("Data Area", ecometricaLayers, {'layers': 'Ecometrica:havedata', format: 'image/png', transparent: true}, {isBaseLayer: false, opacity: 0.2, 'layerId': 'dataarea'})
];

function round(number) {
	return Math.floor(number);
}

function sluggify(str) {
	return str.replace(/\s+/gi, '_');
}

function showHelp(elementId) {
	jQuery('.help').hide();
	jQuery('#' + elementId).show();
}

function startPolygon() {
	polygonControl.activate();
	showHelp('startPolygon');
}

function endPolygon() {
	jQuery('.help').hide();
}

function openDialog(elt) {
    jQuery('#layerInformation div').hide();
    jQuery(elt).show();
}

function getCoordinates(feature) {
	var coordinates = '';
	var vertices = feature.geometry.getVertices();
	for (var i = 0; i < vertices.length; i++) {
		coordinates += vertices[i].x + ' ' + vertices[i].y + ', ';
	}
	
	coordinates += vertices[0].x + ' ' + vertices[0].y + ''; // Close the circle.

	return coordinates;
}

function jsonToHighchart(json) {
	var data = [];
	var total = 0;
	for (var datapoint in json.values) {
		if (json.values[datapoint].value1 !== 0 && json.values[datapoint].label != '-9999') {
			data[data.length] = {'name': json.values[datapoint].label, 'y': round(json.values[datapoint].value1)};
			total += (json.values[datapoint].value1) * 1;
		}
	}
	return data;
}

function jsonSummationToHighchart(json) {
	var data = [];
	var total = 0;
	for (var datapoint in json.values) {
		if (json.values[datapoint].value1 !== 0 && json.values[datapoint].label != '-9999') {
			var val = round(json.values[datapoint].value1 * json.values[datapoint].value2 * hectaresPerCell);
			data[data.length] = {'name': json.values[datapoint].label, 'y': val};
			total += val;
		}
	}
	return data;
}

function jsonSelfCategorizationToHighchart(json) {
	var data = [];
	for (var datapoint in json.values) {
		if (json.values[datapoint].value1 !== 0 && json.values[datapoint].label != '-9999') {
			var val = round(json.values[datapoint].value2 * hectaresPerCell); // number of cells x number of hectares per cell.  Blast!
			data[data.length] = {'name': json.values[datapoint].label, 'y': val};
		}
	}
	return data;
}

/* The rendering functions expect json of some description;  but if it's already been
   processed into chart form,  it doesn't need to be re-wrangled into a chart form. */
function identityDataWrangle(obj) {
	return obj;
}

function renderTotalNumber(json, elementId, chartTitle, polygonId, multiplier) {
	if (multiplier == null) {
		multiplier = 1;
	}
	var value = 0;
	if (json.values.length > 0) {
		value = round(json.values[0].value1 * multiplier);
	}
	features[polygonId][elementId] = value;
	jQuery('#' + elementId + polygonId).empty().text(value);
	jQuery('#' + elementId + polygonId).format({format: '#,###'});	
/*	jQuery('.format').each(function () {
		jQuery(this).format({format: '#,###'}).removeClass('format');
	})*/
}

function getLabel(label) {
	if (labels[label] != null) {
		return labels[label].label;
	}
	return label;
}

function getColour(label) {
	if (labels[label] != null) {
		return labels[label].color;
	}
	return null;
}

function formatTonnes() {
	return this.y + ' Tonnes ';// + getLabel(this.point.name);
}

function formatArea() {
	return this.y + ' Hectares '; // + getLabel(this.point.name);
}

function getChartColours(json) {
	var colours = [];
	for (var datapoint in json.values) {
		if (json.values[datapoint].value1 !== 0 && json.values[datapoint].label != '-9999') {
			var colour = getColour(json.values[datapoint].label);
			if (colour != null) {
				colours[colours.length] = colour;
			}
		}
	}
	return colours;
}

function renderLayerLegend(legend, elementId) {
	
}

function renderLegend(json, elementId, chartTitle, polygonId) {
	var parent = jQuery('#' + elementId + polygonId);
	for (var datapoint in json.values) {
		if (json.values[datapoint].value1 !== 0 && json.values[datapoint].label != '-9999') {
			var index = json.values[datapoint].label;
			parent.append('<div class="legendary" style="background-color: ' + getColour(index) + '"></div> ' + getLabel(index) + '<br />');
		}
	}
}

function renderCategoryTable(json, elementId, chartTitle, polygonId) {
	var parent = jQuery('#' + elementId + polygonId);
	var cssClass = '';
	parent.append('<tr><th> &nbsp; &nbsp; </th><th>' + chartTitle + '</th><th><nobr>tC/ha</nobr></th><th>Area (Hectares)</th><th>Total Carbon (Tonnes)</th></tr>');
	for (var datapoint in json.values) {
		if (json.values[datapoint].value1 !== 0 && json.values[datapoint].label != '-9999') {
			cssClass = (cssClass == '') ? 'altRow' : '';
			
			var index = json.values[datapoint].label;
			parent.append('<tr class="' + cssClass + '"><td style="background-color: ' + getColour(index) + '"></td><td>' + getLabel(index) + '</td><td class="format goright">' + Math.round(json.values[datapoint].value1) + '</td><td class="format goright">' + Math.round(json.values[datapoint].value2 * hectaresPerCell) + '</td><td class="format goright">' + Math.round(json.values[datapoint].value1 * json.values[datapoint].value2 * hectaresPerCell) + '</td></tr>');
		}
	}
	jQuery('.format').each(function () {
		jQuery(this).format({format: '#,###'}).removeClass('format');
	});
}

function renderPieChart(json, elementId, chartTitle, polygonId, dataWranglingFunction, formatFunction, colours) {
	if (dataWranglingFunction == null) {
		dataWranglingFunction = jsonToHighchart;
	}

	if (colours == null) {
		colours = defaultColours;
	}

	var chartdata = dataWranglingFunction(json);

	features[polygonId][elementId] = chartdata;

	if (chartdata.length === 0) {
		jQuery('#' + elementId + polygonId).text('No Data Available for ' + chartTitle).css({'height': 'auto'});
		return;
	}
	
	var chart = new Highcharts.Chart({
		chart: {
			renderTo: elementId + polygonId,
			margin: [30, 20, 20, 20],
			backgroundColor: 'transparent',
			width: 380,
			height: 200
		},
		colors: colours,
		title: {
			text: chartTitle,
			style: {
				color: '#fff',
				'font-size': '9pt'
			}
		},
		plotArea: {
			shadow: null,
			borderWidth: null,
			backgroundColor: null
		},
		tooltip: {
			formatter: formatFunction,
			style: {
				color: '#333333',
				'font-size': '7pt',
				padding: '5px',
				width: '100px'
			}
		},
		plotOptions: {
			pie: {
				dataLabels: {
					enabled: false
				}
			}
		},
		legend: {
			enabled: false
		},
        series: [{
			type: 'pie',
			data: chartdata
		}]
	});
}

// Display the layer information for the layer with the specified layer id.
function openLayerInformation(layerid) {
	jQuery('.rightyBox').hide();
	jQuery('#outerPolygonCharts' + layerid).show();
	jQuery('#polygonCarbon' + layerid).show();
	jQuery('.polygonTab').removeClass('currentTab');
	jQuery('#carbonTab' + polygonCount).addClass('currentTab');
}

var runningCount = 0; // The number of outstanding JSON queries
// Do a JSON request
function query(params, callback, title, baseElementId, polygonId, dataWranglingFunction) {
	runningCount = runningCount + 1;
	jQuery('#status' + polygonId).text(runningCount + ' Queries running');
	jQuery.getJSON('http://mapviewer.ecometrica.org/query/' + APIKEY + '/?callback=?', params, function (data) {
		callback(data, baseElementId, title, polygonId, dataWranglingFunction);
		runningCount = runningCount - 1;
		jQuery('#status' + polygonId).text(runningCount + ' Queries running');
	});	
}

// Show the first tab.
function processTotals(data, id, title, polygonId, param) {
	renderTotalNumber(data, 'totalCarbon', 'Total Carbon', polygonId, param);
	renderTotalNumber(data, 'averageCarbon', 'Carbon Density per Hectare', polygonId);	 
}

function processCategorization(data, baseElementId, title, polygonId, dataWranglingFunction) {
	var colours = getChartColours(data);

	renderPieChart(data, 'total' + baseElementId, 'Total Carbon By ' + title, polygonId, jsonSummationToHighchart, formatTonnes, colours);
	renderPieChart(data, 'area' + baseElementId, 'Area By ' + title, polygonId, jsonSelfCategorizationToHighchart, formatArea, colours);
	renderCategoryTable(data,  baseElementId + 'Table', title, polygonId);
}

// Show the charts / legend for vegetation.
function processVegetation(data, id, title, polygonId, dataWranglingFunction) {
	var colours = getChartColours(data);
	renderPieChart(data, 'totalCarbonByType', 'Total Carbon By Vegetation Type', polygonId, jsonSummationToHighchart, formatTonnes, colours);
	renderPieChart(data, 'areaByType', 'Area By Vegetation Type', polygonId, jsonSelfCategorizationToHighchart, formatArea, colours);
	renderCategoryTable(data, 'vegetationTable', 'Vegetation Type', polygonId);
}

// Show the charts / legend for risk.
function processRisk(data, id, title, polygonId, dataWranglingFunction) {
	var colours = getChartColours(data);
	renderPieChart(data, 'totalCarbonByRisk', 'Total Carbon By Risk', polygonId, jsonSummationToHighchart, formatTonnes, colours);
	renderPieChart(data, 'areaByRisk', 'Area By Risk', polygonId, jsonSelfCategorizationToHighchart, formatArea, colours);
	renderCategoryTable(data, 'riskTable', 'Risk Level', polygonId);
}

function deletePolygon(polygonId) {
	var feature = features[polygonId];
	
	feature.feature.destroy();
	
	features[polygonId] = null;
	jQuery('#polygonList' + polygonId).remove();
	jQuery('#outerPolygonCharts' + polygonId).hide();
	jQuery('#outerPolygonCharts' + polygonId).remove();
}

// Currently not in use.
// Shows total carbon by vegetation for all polygons.
function showVegetation() {
	jQuery('#byVegetation').empty();
	jQuery('#byVegetation').css('width', (polygonCount * 410) + 10);
	for (var i = 1; i <= polygonCount; i = i + 1) {
		if (features[i] !== null && features[i].totalCarbonByType !== []) {
			jQuery('#byVegetation').append('<div id="totalCarbonByTypeVeg' + i + '" class="chart"></div>');
			renderPieChart(features[i].totalCarbonByType, 'totalCarbonByTypeVeg', 'Total Carbon By Vegetation Type, Polygon ' + i, 'moo', i, identityDataWrangle, formatTonnes);
		}
	}
	jQuery('#superOuterByVegetation').show('fast');
}

var loaded = false;
function onFirstLoadEvent() {
    if (!loaded) {
        jQuery('#loading').fadeOut();
        jQuery('#introduction').fadeIn();
        loaded = true;
    }
}

function bindHelp(triggerElt, helpElt) {
	jQuery(triggerElt).hover(function() {
	     beHelpful(helpElt);
	}, function() {
	     beUnhelpful(helpElt);
	});
}
			
function beHelpful(helpElt) {
    if (jQuery('#showHelp:checked').length > 0) {
        jQuery(helpElt).fadeIn();
    }
}

function beUnhelpful(helpElt) {
    if (jQuery('#showHelp:checked').length > 0) {
        jQuery(helpElt).fadeOut();
    }
}
var max_zoom = 0;
function initializeMap(elementId, apikey, options) {
	// Create a map, in the specified element ID, limited to the whole world.
	var map = new OpenLayers.Map(elementId, {restrictedExtent: new OpenLayers.Bounds(-180, -90, 180, 90)});

	// Create the layer for polygons
	var vectorLayer = new OpenLayers.Layer.Vector("Polygons", {'displayInLayerSwitcher': false});
	map.addLayer(vectorLayer);

	// Create the layers.
	map.addLayers(coreLayers);
//	map.addLayers(availableLayers);

	for (var layerIndex = 0; layerIndex < mappingLayers.length; layerIndex++) {
		layerDefinition = mappingLayers[layerIndex];
        var layer = new OpenLayers.Layer.WMS(layerDefinition.displayname, ecometricaLayers, {'layers': layerDefinition.layername, 'format': layerDefinition.format, 'transparent': true}, {'legend': layerDefinition.legend, 'isBaseLayer': false, 'opacity': '0.8', 'visibility': !layerDefinition.heavylayer, 'displayInLayerSwitcher': true, 'htmlLegend': layerDefinition.htmlLegend, 'alpha': true, 'layerId': layerDefinition.layerId });
		map.addLayer(layer);

    	layer.events.register('loadend', null, onFirstLoadEvent);

		jQuery('#layerInformation').append('<div id="' + layerDefinition.layerId + '" style="display: none" class="infomaticBox rounded"><h3 class="bordered rounded">' + layerDefinition.displayname + ' <img src="/s/img/close.png" class="close" onclick="jQuery(\'#' + layerDefinition.layerId + '\').hide()"/></h3>' + layerDefinition.blurbHtml + '</div>');
		
	}

	// The control that allows modifying polygons
	modifyFeatureControl = new OpenLayers.Control.ModifyFeature(vectorLayer);
	map.addControl(modifyFeatureControl);

	// Always show the scale and mouse position, for now at least.  This will likely
	// become optionized.

	// If the initial bounds are provided, zoom there.
	if (options.initialBounds) {
		map.zoomToExtent(options.initialBounds);
        map.setOptions({restrictedExtent: options.initialBounds});
        map.setOptions({maxExtent: options.initialBounds});
        max_zoom = map.zoom;
	}

	map.events.register('loadstart', null, function() {
        jQuery('#loading').hide();
	});
		
	// If there's an element for showing the zoom level, set it up.
	if (options.zoomElementId) {
		jQuery('#zoomLevel').text('Zoom Level ' + map.zoom);

		map.events.register("zoomend", null, function () {
            //  If not being able to zoom out to the whole world is a problem, remove this check.
            // Setting maxExtent/restrictedExtent doesn't stop you from zooming out.  Ugh.  So this
            // is here to do that.  max_zoom is set when the map is setup.  If you're further out
            // it'll jump to there.
		    if (map.zoom < max_zoom) {
		      map.zoomTo(max_zoom);
		      return;
		    }
			jQuery('#zoomLevel').text('Zoom Level ' + map.zoom);
		});	
	}
}


