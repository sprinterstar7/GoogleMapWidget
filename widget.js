
prism.registerWidget("googleMaps", {

	name : "googleMaps",
	family : "maps",
	title : "Google Maps",
	iconSmall : "/plugins/googleMapsWidget/widget-24.png",
	styleEditorTemplate : null,
	style : {},
	// sizing must be stated
	sizing: {

		minHeight: 128, //header
		maxHeight: 2048,
		minWidth: 128,
		maxWidth: 2048,
		height: 640,
		defaultWidth: 512
	},
	data : {

		selection : [],
		defaultQueryResult : {},

		panels : [
			//dimension panel
			{
				name : 'latlng',
				type : 'visible',
				metadata : {

					types : ['dimensions'],
					maxitems : -1
				}
			},
			{//measure panel
				name : 'value',
				type : 'visible',
				metadata : {

					types : ['measures'],
					maxitems : 1
				}
			},
			{
				name : 'color',
				type : 'series',
				metadata : {
					types : ['dimensions'],
					maxitems : 1
				}
			},
			{
				name : 'details',
				type : 'visible',
				metadata : {
					types : ['dimensions'],
					maxitems : -1
				}
			},
			{
				name: 'filters',
				type: 'filters',
				metadata: {

					types: ['dimensions'],
					maxitems: -1
				}
			}
		],

		canColor: function (widget, panel, item) {
			return panel.name === "color";
		},

		allocatePanel : function (widget, metadataItem) {
			// measure
			if (prism.$jaql.isMeasure(metadataItem) && widget.metadata.panel("value").items.length === 0) {

				return "value";
			}

			// group by
			else if (!prism.$jaql.isMeasure(metadataItem) && widget.metadata.panel("color").items.length === 0) {

				return "color";
			}

			// details
			else if (!prism.$jaql.isMeasure(metadataItem) && widget.metadata.panel("details").items.length === 0) {

				return "details";
			}

			// item
			else if (!prism.$jaql.isMeasure(metadataItem) && widget.metadata.panel("latlng").items.length < 3) {

				return "latlng";
			}
		},

		// returns true/ reason why the given item configuration is not/supported by the widget
		isSupported : function (items) {

			return this.rankMetadata(items, null, null) > -1;
		},

		// ranks the compatibility of the given metadata items with the widget
		rankMetadata : function (items, type, subtype) {

			var a = prism.$jaql.analyze(items);

			// require at least 2 dimensions of lat and lng and 1 measure
			if (a.dimensions.length >= 2 && a.measures.length == 1) {

				return 0;
			}
			return -1;
		},

		// populates the metadata items to the widget
		populateMetadata : function (widget, items) {

			var a = prism.$jaql.analyze(items);

			// allocating dimensions
			widget.metadata.panel("latlng").push(a.dimensions);
			widget.metadata.panel("value").push(a.measures);
			widget.metadata.panel("color").push(a.color);
			widget.metadata.panel("details").push(a.details);
			widget.metadata.panel("filters").push(a.filters);
		},

		// builds a jaql query from the given widget
		buildQuery : function (widget) {
			//
			// building jaql query object from widget metadata
			var baseUrl = "/QueryHandler.ashx?"
			var elasticube = "Wells 2.0 - Production"
			var elasticubeParam = "elasticube="+elasticube;
			var zoomLevel = -1;
			var zoomLevelParam = "&zoomLevel="+zoomLevel;
			//var endpoint =  encodeURI((baseUrl + elasticubeParam + zoomLevelParam));

			var query = {
				datasource : widget.datasource,
				//endpoint: endpoint,
				metadata : []
			};

			query.count = 25000;//0;
			query.offset = 0;

			var testQuery = {
				datasource : widget.datasource,
				metadata : []
			};
			testQuery.metadata.push({
				"jaql": {
					"formula":"COUNT(Id)",
					"context": {
						"[Id]" : { 
							"table": "Well",
							"column": "Well Unique Id",
							"dim": "[Well.Well Unique Id]",
							"datatype": "numeric"
						}
					},
					
					"title": "Id Count"
				}
			});

			// pushing items
			widget.metadata.panel("latlng").items.forEach(function (item) {

				query.metadata.push(item);
			});

			// pushing data
			/*if (widget.queryMetadata) query.metadata.push(widget.queryMetadata);
			 else {
			 query.metadata.push({"zoom": 4,
			 "neLat": 53.51418466756816,
			 "neLong": -65.47851600000001,
			 "swLat": 16.172473045501924,
			 "swLong": -125.94726600000001
			 });
			 }*/

			query.metadata.push(widget.metadata.panel("value").items[0]);

			// pushing color
			var colorPanel = widget.metadata.panel("color");
			if (colorPanel && colorPanel.items.length > 0) {
				query.metadata.push(colorPanel.items[0])
			}

			// pushing details
			var detailsPanel = widget.metadata.panel("details");
			if(detailsPanel){
				detailsPanel.items.forEach(function (item) {
					query.metadata.push(item);
				});
			}

			// filters
			widget.metadata.panel('filters').items.forEach(function (item) {

				item = $$.object.clone(item, true);
				item.panel = "scope";

				query.metadata.push(item);
				testQuery.metadata.push({"panel": "scope", "jaql": item.jaql});
			});
			
			// Dashboard filters
			prism.activeDashboard.filters.flatten().forEach(function (object) {
				object.panel = "scope";
				testQuery.metadata.push(object);
			});
			
			// Add the dimensions of the map to the widget filter
			/*query.metadata.push({
				"disabled": false,
				"jaql": {
					"collapsed": false,
					"column": "Latitude",
					"datatype": "numeric",
					"dim": "[Well.Latitude]",
					"filter": {
						"from": (widget.mapSettings === undefined) ? "16.172473045501924" : widget.mapSettings.swLat.toString(),
						"to": (widget.mapSettings === undefined) ? "53.51418466756816" : widget.mapSettings.neLat.toString()
					},
					"table": "Well",
					"title": "Latitude"
				},
				"panel": "scope"
 			});
			query.metadata.push({
				"disabled": false,
				"jaql": {
					"collapsed": false,
					"column": "Longitude",
					"datatype": "numeric",
					"dim": "[Well.Longitude]",
					"filter": {
						"from": (widget.mapSettings === undefined) ? "-125.94726600000001" : widget.mapSettings.swLong.toString(),
						"to": (widget.mapSettings === undefined) ? "-65.47851600000001" : widget.mapSettings.neLong.toString()
					},
					"table": "Well",
					"title": "Longitude"
				},
				"panel": "scope"
 			});
			testQuery.metadata.push({
				"disabled": false,
				"jaql": {
					"collapsed": false,
					"column": "Latitude",
					"datatype": "numeric",
					"dim": "[Well.Latitude]",
					"filter": {
						"from": (widget.mapSettings === undefined) ? "16.172473045501924" : widget.mapSettings.swLat.toString(),
						"to": (widget.mapSettings === undefined) ? "53.51418466756816" : widget.mapSettings.neLat.toString()
					},
					"table": "Well",
					"title": "Latitude"
				},
				"panel": "scope"
 			});
			testQuery.metadata.push({
				"disabled": false,
				"jaql": {
					"collapsed": false,
					"column": "Longitude",
					"datatype": "numeric",
					"dim": "[Well.Longitude]",
					"filter": {
						"from": (widget.mapSettings === undefined) ? "-125.94726600000001" : widget.mapSettings.swLong.toString(),
						"to": (widget.mapSettings === undefined) ? "-65.47851600000001" : widget.mapSettings.neLong.toString()
					},
					"table": "Well",
					"title": "Longitude"
				},
				"panel": "scope"
 			});*/

			$.ajax({
				type: 'POST',
				url: encodeURI('/api/datasources/' + widget.datasource.title + '/jaql'),
				data: JSON.stringify(testQuery),
				success: function(data) {
					var result = data.values[0];
					var count = (result.length === undefined) ? result.data : result[0].data;
					var column;
					if (count > query.count) {
						//console.log(count);
						
						try {
							if (colorPanel && colorPanel.items.length > 0) query.metadata.splice(3,1);
							if(detailsPanel){
								query.metadata.splice(3, detailsPanel.items.length);
							}
							
							switch(widget.mapSettings.zoomLevel)
							{
								case 6:
								case 7:
								case 8:
								case 9:
								case 10: 
								case 11:
								case 12: column = "1";
									break;
								case 13:
								case 14:
								case 15: 
								case 16: column = "2";
									break;
								case 17:
								case 18:
								case 19:
								case 20: column = "3";
									break;
								default: // Map's first load
										column = "0";
									break;
							}
						}
						catch(err) { column = "0";};
						
					}
					else column = "";

					query.metadata[0].jaql.column = "Latitude" + column;
					query.metadata[0].jaql.title = "Latitude" + column;
					query.metadata[0].jaql.dim = "[Well.Latitude" + column + "]";
					query.metadata[1].jaql.column = "Longitude" + column;
					query.metadata[1].jaql.title = "Longitude" + column;
					query.metadata[1].jaql.dim = "[Well.Longitude" + column + "]";

				},
				dataType: 'json',
				async: false
			});

			return query;
		},

		// prepares the widget-specific query result from the given result data-table
		processResult : function (widget, queryResult) {
			// request google maps
			if(typeof google == "undefined"){
				$.ajax({
					type : "GET",
					//url : 'https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=false&callback=onGoogleMapLoaded',
					url : 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCKFgS1fJWpAgMHLh4wwBNvz0yO5PXV0lc&libraries=places,drawing,geometry,visualization&callback=onGoogleMapLoaded',
					dataType : "script",
					cache : true
				});
			}

			return queryResult;
		}
	},
	render : function (s, e) {
		var externalPaths = {
			markerclusterer: '://rawgit.com/googlemaps/js-marker-clusterer/gh-pages/src/markerclusterer.js',
			infobox: '://rawgit.com/googlemaps/v3-utility-library/master/infobox/src/infobox.js',
			overlappingMarkerSpiderfier: '://jawj.github.io/OverlappingMarkerSpiderfier/bin/oms.min.js',
			gapi: '://apis.google.com/js/client.js',
			images: {
				cluster:'://rawgit.com/googlemaps/v3-utility-library/master/markerclustererplus/images/m',
				pinColor:'://chart.googleapis.com/chart?chst=dmap_pin_letter&chld=%E2%80%A2|'//,
				//pinShadow: '://chart.googleapis.com/chart?chst=dmap_pin_shadow'
			}
		};

		// appending
		var $lmnt = $(e.element),
			protocol = (window.location.protocol == "https:") ? 'https': 'http';

		window.onGoogleMapLoaded = function () {

			//	Load scripts for Google Maps, Clustering Markers Extension, and Overlapping Markers Extension
			$.getScript(protocol + externalPaths.gapi, function (data, textStatus) {
				$.getScript("https://www.google.com/jsapi", function(data, textStatus) {
					$.getScript(protocol + externalPaths.markerclusterer, function (data, textStatus) {
						$.getScript(protocol + externalPaths.infobox, function (data, textStatus) {
							$.getScript(protocol + externalPaths.overlappingMarkerSpiderfier, function (data, textStatus) {
								gapi.client.setApiKey('AIzaSyBng-i-_-yfQdfS5COep3e3oV6kQOjwEuA');
								gapi.client.load('urlshortener', 'v1', function () { });
								// MOVE THIS!!!!
								/**
								 * @license
								 *
								 * Copyright 2011 Google Inc.
								 *
								 * Licensed under the Apache License, Version 2.0 (the "License");
								 * you may not use this file except in compliance with the License.
								 * You may obtain a copy of the License at
								 *
								 *     http://www.apache.org/licenses/LICENSE-2.0
								 *
								 * Unless required by applicable law or agreed to in writing, software
								 * distributed under the License is distributed on an "AS IS" BASIS,
								 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
								 * See the License for the specific language governing permissions and
								 * limitations under the License.
								 */

								/**
								 * @fileoverview Map Label.
								 *
								 * @author Luke Mahe (lukem@google.com),
								 *         Chris Broadfoot (cbro@google.com)
								 */

								/**
								 * Creates a new Map Label
								 * @constructor
								 * @extends google.maps.OverlayView
								 * @param {Object.<string, *>=} opt_options Optional properties to set.
								 */

								function MapLabel(opt_options) {
									this.set('fontFamily', 'sans-serif');
									this.set('fontSize', 12);
									this.set('fontColor', '#000000');
									this.set('strokeWeight', 4);
									this.set('strokeColor', '#ffffff');
									this.set('align', 'center');

									this.set('zIndex', 1e3);

									this.setValues(opt_options);
								}
								MapLabel.prototype = new google.maps.OverlayView;

								window['MapLabel'] = MapLabel;


								/** @inheritDoc */
								MapLabel.prototype.changed = function(prop) {
									switch (prop) {
										case 'fontFamily':
										case 'fontSize':
										case 'fontColor':
										case 'strokeWeight':
										case 'strokeColor':
										case 'align':
										case 'text':
											return this.drawCanvas_();
										case 'maxZoom':
										case 'minZoom':
										case 'position':
											return this.draw();
									}
								};

								/**
								 * Draws the label to the canvas 2d context.
								 * @private
								 */
								MapLabel.prototype.drawCanvas_ = function() {
									var canvas = this.canvas_;
									if (!canvas) return;

									var style = canvas.style;
									style.zIndex = /** @type number */(this.get('zIndex'));

									var ctx = canvas.getContext('2d');
									ctx.clearRect(0, 0, canvas.width, canvas.height);
									ctx.strokeStyle = this.get('strokeColor');
									ctx.fillStyle = this.get('fontColor');
									ctx.font = this.get('fontSize') + 'px ' + this.get('fontFamily');

									var strokeWeight = Number(this.get('strokeWeight'));

									var text = this.get('text');
									if (text) {
										if (strokeWeight) {
											ctx.lineWidth = strokeWeight;
											ctx.strokeText(text, strokeWeight, strokeWeight);
										}

										ctx.fillText(text, strokeWeight, strokeWeight);

										var textMeasure = ctx.measureText(text);
										var textWidth = textMeasure.width + strokeWeight;
										style.marginLeft = this.getMarginLeft_(textWidth) + 'px';
										// Bring actual text top in line with desired latitude.
										// Cheaper than calculating height of text.
										style.marginTop = '-0.4em';
							  }
							};

							/**
							 * @inheritDoc
							 */
							MapLabel.prototype.onAdd = function() {
							  var canvas = this.canvas_ = document.createElement('canvas');
							  var style = canvas.style;
							  style.position = 'absolute';

							  var ctx = canvas.getContext('2d');
							  ctx.lineJoin = 'round';
							  ctx.textBaseline = 'top';

							  this.drawCanvas_();

							  var panes = this.getPanes();
							  if (panes) {
								panes.mapPane.appendChild(canvas);
							  }
							};
							MapLabel.prototype['onAdd'] = MapLabel.prototype.onAdd;

							/**
							 * Gets the appropriate margin-left for the canvas.
							 * @private
							 * @param {number} textWidth  the width of the text, in pixels.
							 * @return {number} the margin-left, in pixels.
							 */
							MapLabel.prototype.getMarginLeft_ = function(textWidth) {
							  switch (this.get('align')) {
								case 'left':
								  return 0;
								case 'right':
								  return -textWidth;
							  }
							  return textWidth / -2;
							};

							/**
							 * @inheritDoc
							 */
							MapLabel.prototype.draw = function() {
							  var projection = this.getProjection();

							  if (!projection) {
								// The map projection is not ready yet so do nothing
								return;
							  }

							  if (!this.canvas_) {
								// onAdd has not been called yet.
								return;
							  }

							  var latLng = /** @type {google.maps.LatLng} */ (this.get('position'));
							  if (!latLng) {
								return;
							  }
							  var pos = projection.fromLatLngToDivPixel(latLng);

							  var style = this.canvas_.style;

							  style['top'] = pos.y + 'px';
							  style['left'] = pos.x + 'px';

							  style['visibility'] = this.getVisible_();
							};
							MapLabel.prototype['draw'] = MapLabel.prototype.draw;

							/**
							 * Get the visibility of the label.
							 * @private
							 * @return {string} blank string if visible, 'hidden' if invisible.
							 */
							MapLabel.prototype.getVisible_ = function() {
							  var minZoom = /** @type number */(this.get('minZoom'));
							  var maxZoom = /** @type number */(this.get('maxZoom'));

							  if (minZoom === undefined && maxZoom === undefined) {
								return '';
							  }

							  var map = this.getMap();
							  if (!map) {
								return '';
							  }

							  var mapZoom = map.getZoom();
							  if (mapZoom < minZoom || mapZoom > maxZoom) {
								return 'hidden';
							  }
							  return '';
							};

							/**
							 * @inheritDoc
							 */
							MapLabel.prototype.onRemove = function() {
							  var canvas = this.canvas_;
							  if (canvas && canvas.parentNode) {
								canvas.parentNode.removeChild(canvas);
							  }
							};
							MapLabel.prototype['onRemove'] = MapLabel.prototype.onRemove;

							
							//	All 3 scripts loaded, Get the data
							var qresult = s.queryResult.$$rows; // results
							var headers = s.rawQueryResult.headers; // headers
							
							//	Define function to format numbers w/ commas
							function formatWithCommas(x) {
								var parts = x.toString().split(".");
								return parts[0].replace(/\B(?=(\d{3})+(?=$))/g, ",") + (parts[1] ? "." + parts[1] : "");
							};

							
							function createMarker(radius, color) {

							  var canvas, context;
							  var square = 2*radius;

							  canvas = document.createElement("canvas");
							  canvas.width = square;
							  canvas.height = square;

							  context = canvas.getContext("2d");

							  context.clearRect(0,radius,square,square);

							  // background is yellow
							  context.fillStyle = color;//"rgba(0,160,220,1)";
							  //context.fillStyle = "rgba(247,149,72,1)";
							  //context.fillStyle = "rgba(254,207,5,1)";

							  // border is black
							  context.strokeStyle = "rgba(0,0,0,1)";

							  context.beginPath();
							  context.arc(radius, radius, radius, 0, 2 * Math.PI);
							  context.closePath();

							  context.fill();
							  context.stroke();

							  return canvas.toDataURL();

							}
							var testMarker = createMarker(10, "#00A0DC");
							
							// initialize map & map options
							var myOptions = {
								mapTypeId : google.maps.MapTypeId.ROADMAP,
								zoom: (e.widget.mapSettings.zoomLevel === undefined) ? 4 : e.widget.mapSettings.zoomLevel,
								center: (e.widget.mapSettings.center === undefined) ? {
											lat: 37.09024, lng: -95.712891
										} : { lat: e.widget.mapSettings.center.lat, lng: e.widget.mapSettings.center.lng },
								styles: [
											{
												"featureType": "landscape",
												"stylers": [
													{ "invert_lightness": true },
													{ "visibility": "simplified" },
													{ "color": "#141414" }
												]
											}, {
												"featureType": "water",
												"stylers": [
													{ "color": "#323232" },
													{ "visibility": "on" }
												]
											}, {
												"featureType": "administrative.locality",
												"stylers": [
													{ "visibility": "off" }
												]
											}, {
												"featureType": "administrative.neighborhood",
												"stylers": [
													{ "visibility": "off" }
												]
											}, {
												"featureType": "administrative.land_parcel",
												"stylers": [
													{ "visibility": "on" }
												]
											}, {
												"featureType": "poi",
												"stylers": [
													{ "visibility": "off" }
												]
											}, {
												"featureType": "road.highway",
												"stylers": [
												{ "invert_lightness": true },
													{ "visibility": "simplified" }
												]
											}, {
												"featureType": "road.arterial",
												"stylers": [
													{ "visibility": "off" }
												]
											}, {
												"featureType": "road.local",
												"stylers": [
													{ "visibility": "off" }
												]
											}, {
												"featureType": "transit",
												"stylers": [
													{ "visibility": "off" }
												]
											}, {
												"featureType": "road.highway",
												"elementType": "labels.icon",
												"stylers": [
													{ "visibility": "off" }
												]
											}, {
												"featureType": "administrative.country",
												"elementType": "geometry.fill"
											}, {
												"elementType": "labels.text.fill",
												"stylers": [
													{ "color": "#000000" }
												]
											}, {
												"featureType": "administrative",
												"elementType": "geometry.fill",
												"stylers": [
													{ "color": "#141414" }
												]
											}
										]
							};
							var map = new google.maps.Map($lmnt[0], myOptions); // element is jquery element but we need dom element as map container hence the accessor
							
							//Add refresh button
							google.maps.event.addListenerOnce(map, 'idle', function () {

								if ($('#mapRefresh').length < 1) {
									var mapRefreshButton = $('<div id="mapRefresh" title="Refresh Results">' +
										'<div class="update-icon"></div>' +
										'</div>');

									map.controls[google.maps.ControlPosition.RIGHT].push(mapRefreshButton[0]);

									$('#mapRefresh').on('mouseover', function () {
										$('#mapRefresh a i').addClass('fa-spin').addClass('fa-fw');
									});
									$('#mapRefresh').on('mouseout', function () {
										$('#mapRefresh a i').removeClass('fa-spin').removeClass('fa-fw');
									});

									$('#mapRefresh').on('click', function () {
										$('#mapRefresh').hide();

										var mapBounds = map.getBounds();
										var NE = mapBounds.getNorthEast();
										var SW = mapBounds.getSouthWest();
										
										var lat = {
											"jaql": {
												"table": "Well",
												"column": "Latitude",
												"dim": "[Well.Latitude]",
												"datatype": "numeric",
												"title": "Latitude",
												"filter": {
													"from": SW.lat(),
													"to": NE.lat()
												}
											}
										};

										var long = {
											"jaql": {
												"table": "Well",
												"column": "Longitude",
												"dim": "[Well.Longitude]",
												"datatype": "numeric",
												"title": "Longitude",
												"filter": {
													"from": SW.lng(),
													"to": NE.lng()
												}
											}
										};
										var options = {
											save: false,
											refresh: false
										};

										//  Set via JavaScript API
										prism.activeDashboard.filters.update(lat,options);
										prism.activeDashboard.filters.update(long,options);
										
										//  Make sure the widgets get refreshed
										var refreshDashboard = function(){
											$.each(prism.activeDashboard.widgets.$$widgets,function(){
												this.refresh();
											})
										};

										setTimeout(refreshDashboard,500);
									});

									$('#mapRefresh').hide();
								}

								//Activate the bounds changed function only after the map has been idle for a second
							});

							// County lines
							var _countyLabels = [];
							var _countyListener = null;
							var countyLayer = new google.maps.FusionTablesLayer({
								query: {
									select: 'geometry, County Name',
									from: '1xdysxZ94uUFIit9eXmnw1fYc6VcQiXhceFd_CVKa'
								},
								suppressInfoWindows: true,
								styles: [{
									polygonOptions: {
										fillColor: '#0000FF',
										fillOpacity: 0.01,
										strokeColor: '#FFFFFF'
										}
									}]
								});

								google.load('visualization', '1.0',
									{
										packages: ['corechart', 'table', 'geomap'],
										callback: initializeCountyNames
									}
								);

								function initializeCountyNames() {
									//3215 is the number of counties in this table
									//TOP 500 is hard limit imposed by google.
									//Iterate results 500 at a time by using OFFSET and LIMIT
									for (var i = 0; i < 7; i ++) {
										var tableId = "1xdysxZ94uUFIit9eXmnw1fYc6VcQiXhceFd_CVKa";
										var queryStr = "SELECT 'State-County', geometry FROM " + tableId + " OFFSET " + (i * 500) + " LIMIT 500";
										var queryText = encodeURIComponent(queryStr);
										var query = new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq=' + queryText);
										query.send(displayCountyText);
									}
								}

								function displayCountyText(response) {
									var numRows = response.getDataTable().getNumberOfRows();
									for (i = 0; i < numRows; i++) {
										var name = response.getDataTable().getValue(i, 0);
										var polygon = response.getDataTable().getValue(i, 1);
										var nameStr = name.toString();
										var polygonArray = polygon.toString().replace("<Polygon><outerBoundaryIs><LinearRing><coordinates>", "").replace("</coordinates></LinearRing></outerBoundaryIs></Polygon>", "").split(" ");
										var lat = 0;
										var lng = 0;
										var total = 0;
										_.each(polygonArray, function (arr) {
											var coord = arr.split(",")
											lat += Number(coord[0]);
											lng += Number(coord[1]);
											total += 1;
										});
										lat = lat / total;
										lng = lng / total;
										var mapLabel = new MapLabel({
											text: nameStr,
											position: new google.maps.LatLng(lng, lat),
											map: null,
											strokeWeight: 5,
											fontSize: 16,
											align: 'center'
										});
										_countyLabels.push(mapLabel);
									};
								}

								//Map Side Bar Begin
								$(map.getDiv()).append($('<div id="mapSidebar">'
									+ '<div id="mapSidebarHide" title="Hide Shaping Functionality"><i class="fa fa-caret-left"></i></div>'
									+ '<div id="mapSidebarContent"></div>'
									+ '</div>'));
								$('#mapSidebar').css('left', 0);
								$('#mapSidebar').css('top', 0);
								$('#mapSidebar').hide();

								$(map.getDiv()).append($('<div id="mapSidebarShow" title="Show Shaping Functionality"><i class="fa fa-caret-right"></i></div>'));

								$('#mapSidebarContent').height($(map.getDiv()).height());
								$('#mapSidebarContent').append($('<div id="mapSidebarHeader">Color Legend</div>'))
								$('#mapSidebarContent').append($('<div id="mapSidebarInfo"></div>'))

								$('#mapSidebarInfo').append($('<table id="mapSidebarTable"><tbody></tbody></table>'))
								createSidebarTableHeader(2, ['Color', 'Description']);

								$('#mapSidebarInfo').height($(map.getDiv()).height() - 70);

								$('#mapSidebarHide').click(function () {
									$('#mapSidebar').hide("slide", { direction: "left" }, 200);
									$("#mapSidebarShow").show();
								});

								$('#mapSidebarShow').click(function () {
									$("#mapSidebarShow").hide();
									$('#mapSidebar').show("slide", { direction: "left" }, 200);
								});
								//Map Side Bar End

								// Draw Manager
								var _drawManager = new google.maps.drawing.DrawingManager({
									drawingControl: true,
									drawingControlOptions: {
										position: google.maps.ControlPosition.TOP_CENTER,
										drawingModes: [
											google.maps.drawing.OverlayType.POLYGON
											, google.maps.drawing.OverlayType.CIRCLE
											, google.maps.drawing.OverlayType.RECTANGLE
											, google.maps.drawing.OverlayType.POLYLINE
										]
									},
									circleOptions: {
										fillColor: '#d22927',
										fillOpacity: 0.5,
										strokeWeight: 1,
										strokeColor: '#000000',
										clickable: true,
										editable: false,
										suppressUndo: true
									},
									rectangleOptions: {
										fillColor: '#d22927',
										fillOpacity: 0.5,
										strokeWeight: 1,
										strokeColor: '#000000',
										clickable: true,
										editable: false,
										draggable: false,
										suppressUndo: true
									},
									polygonOptions: {
										fillColor: '#d22927',
										fillOpacity: 0.5,
										strokeWeight: 1,
										strokeColor: '#000000',
										clickable: true,
										editable: false,
										draggable: false,
										suppressUndo: true
									},
									polylineOptions: {
										fillColor: '#d22927',
										fillOpacity: 0.5,
										strokeWeight: 3,
										clickable: true,
										editable: false,
										draggable: true,
										suppressUndo: true
									}
								});
								_drawManager.setMap(map);

								google.maps.event.addListener(_drawManager, 'overlaycomplete', function (event) {
									updateWellIDFilter(event);
								});

								function updateWellIDFilter(event){
									if (event.type == google.maps.drawing.OverlayType.RECTANGLE) {
										var wellFieldName = "Well Unique Id",
											filterFields = prism.activeDashboard.filters.$$items,
											bounds = event.overlay.bounds;

										var wellField = createDashFilter(wellFieldName,filterFields);

										// Add the lat and long as attributes
										addLatLngOrAttribute(wellField,bounds);

										var options = {
											save: false,
											refresh: false
										};

										//  Set via JavaScript API
										prism.activeDashboard.filters.update(wellField,options);

										$('#mapRefresh').show();
									}
								}

								function addLatLngOrAttribute(wellField,bounds){
									var latItem = {"attributes":[{
										"table": "Well",
										"column": "Latitude",
										"dim": "[Well.Latitude]",
										"datatype": "numeric",
										"title": "Latitude",
										"collapsed": true,
										"filter": {
											"and":[{
												"fromNotEqual": bounds.f.f
											}, {
												"toNotEqual": bounds.f.b
											}
											]
										}
									}]};
									var lngItem = {"attributes":[{
										"table": "Well",
										"column": "Longitude",
										"dim": "[Well.Longitude]",
										"datatype": "numeric",
										"title": "Longitude",
										"collapsed": true,
										"filter": {
											"and":[{
												"fromNotEqual": bounds.b.b
											}, {
												"toNotEqual": bounds.b.f
											}
											]
										}
									}]};

									wellField.jaql.filter.or.push({
										"and":[latItem,lngItem]
									});
								}


								function createDashFilter(name,filterFields,from,to){
									var field = getFieldFromItems(name, filterFields);

									if (!field) {
										field = createFieldToFilterPanel(name);
									}

									return field;
								}

								function getFieldFromItems(field,items){
									return _.find(items,function(item){
										if($$get(item,"jaql.dim") &&
											((item.jaql.column).toLowerCase() ===  (field).toLowerCase())){
											return item;
										}
									});
								}

								function createFieldToFilterPanel(fieldName){
									return {
										"jaql": {
											"table": "Well",
											"column": fieldName,
											"dim": "[Well." + fieldName + "]",
											"datatype": "numeric",
											"title": fieldName,
											"filter": {
												"or": []
											}
										}
									};
								}

								//	Define bounding object (for auto zoom/center)
								var bounds = new google.maps.LatLngBounds();

								//	Create an object to handle multiple markers at the same coordinates
								var omsOptions = {
									markersWontMove : true,
									markersWontHide : true,
									keepSpiderfied : true
								};
								var oms = new OverlappingMarkerSpiderfier(map, omsOptions);

								//	Define the info window for popups
								//var infowindow = new google.maps.InfoWindow();

								//	Init Variables
								var i = 0,
									dataSize = qresult.length,
									j,
									headersSize = headers.length,
									markers = [],
									markerText,
									clusterLabel = '',
									colors = { "#00A0DC": testMarker };

								//	Create each marker for the map
								for (; i < dataSize; i++) {

									//	Define the info window HTML
									markerText = '<span style="font-family:arial,sans-serif; line-height:150%;" '
										+ ' onclick="google.maps.closeInfoWindow()" >'
										+ '<span style="line-height:200%;font-size:120%;text-decoration:underline"><b>'
										+ 'INFO' + '</b></span>';

									//	Add the rest of data to be presented in the info window
									var measureIndex = 2;
									j = measureIndex;
									for (; j < headersSize; j++) {
										markerText += '<br><span>' + headers[j] + ': ' + qresult[i][j]["text"] + '</span>';
									}
									markerText += ' </span>';

									//	Get the latitude and longitude for this marker
									var lat = parseFloat(qresult[i][0]["data"]); // latitude
									var lng = parseFloat(qresult[i][1]["data"]); // longitude
									if(isNaN(lat) || isNaN(lng)) continue;

									//	Get the measure label for the clusters
									if (!clusterLabel) {
										clusterLabel = headers[measureIndex];
									}

									//	Determine the marker color from Sisense, or use the default
									var pinColor = '#00A0DC';
									if ((headersSize >= 3) && (qresult[i][3]) && (qresult[i][3].color)) {
										pinColor = qresult[i][3].color;//.replace("#","");
										if ( colors[pinColor] === undefined )
											colors[pinColor] = createMarker(10, pinColor);
									}

									//	Create the marker image and shadow
									/*var pinImage = new google.maps.MarkerImage(protocol + externalPaths.images.pinColor + pinColor,
									 new google.maps.Size(21, 34),
									 new google.maps.Point(0,0),
									 new google.maps.Point(10, 34));
									 /*var pinShadow = new google.maps.MarkerImage(protocol + externalPaths.images.pinShadow,
									 new google.maps.Size(40, 37),
									 new google.maps.Point(0, 0),
									 new google.maps.Point(12, 35));*/

									// Create the marker
									var marker = new google.maps.Marker({
										map : map,
										position : new google.maps.LatLng(lat, lng),
										raiseOnDrag : false,
										visible : true,
										draggable : false,
										icon : colors[pinColor],//testMarker,//pinImage,
										//icon: {
										/*url: protocol + externalPaths.images.pinColor + pinColor,
										 size: new google.maps.Size(21, 34),
										 origin: new google.maps.Point(0,0),
										 anchor: new google.maps.Point(10, 34)
										 /*path: google.maps.SymbolPath.CIRCLE,
										 scale: 8,
										 fillColor: "#FF0000",
										 strokeColor: "#000000",
										 strokeWeight: 0.5,
										 fillOpacity: 1*/
										//},
										//shadow: pinShadow,
										/*shadow: {
										 url: protocol + externalPaths.images.pinShadow,
										 size: new google.maps.Size(40, 37),
										 origin: new google.maps.Point(0,0),
										 anchor: new google.maps.Point(12, 35)
										 },*/
										title : qresult[i][measureIndex]["text"], // the formatted value of each marker
										value : qresult[i][measureIndex]["data"] // the value of each marker
									});

									//	Add data to the marker
									marker.sisenseTooltip = markerText;

									//	Add the marker to the OMS
									//oms.addMarker(marker);

									//	Add the marker's position to the boundary object
									//bounds.extend(marker.position);

									//	Add the marker to the array of all markers
									//markers.push(marker);
									//console.log(i);
								}

								//Add event listeners to each marker, to popup the info window
								/*oms.addListener('click', function(marker, event) {

								 infowindow.setContent(marker.sisenseTooltip);
								 infowindow.open(map, marker);
								 });*/

								//	Creates the clusters markers
								/*var markerCluster = new MarkerClusterer(map, markers, {
								 averageCenter : true,
								 maxZoom : 12,
								 imagePath: protocol +externalPaths.images.cluster
								 });
								 markerCluster.clusterLabel = clusterLabel;*/

								// adjust info window style, if necessary
								/*var infowindow = new InfoBox({
								 closeBoxURL : ""
								 });*/

								// 	Auto Zoom/Center Map
								//map.fitBounds(bounds);

								//	Add hover popup for clusters
								/*google.maps.event.addListener(markerCluster, 'mouseover', function (cluster) {
								 var sum = 0;
								 _.each(cluster["markers_"], function (item) {
								 sum += parseFloat(item["value"]);
								 });
								 sum = Math.round(sum);
								 //infowindow.setContent(cluster.markerClusterer_.clusterLabel + ': ' + formatWithCommas(sum));
								 //infowindow.open(map);
								 //infowindow.setPosition(cluster.getCenter());
								 });
								 /*
								 //	Remove hover popup for clusters
								 google.maps.event.addListener(markerCluster, 'mouseout', function (cluster) {
								 infowindow.close();
								 });

								 //	Close any open info windows when clicking on a cluster
								 google.maps.event.addListener(markerCluster, 'click', function (cluster) {
								 infowindow.close();
								 });

								 //	Define function for closing info windows on click
								 google.maps.closeInfoWindow = function() {
								 infowindow.close();
								 };*/

							google.maps.event.addListener(map, 'bounds_changed', function() {
								var bounds = map.getBounds();
								var NE = bounds.getNorthEast();
								var SW = bounds.getSouthWest();
								var zoom = map.getZoom();
								var center = map.getCenter();
								e.widget.mapSettings = {
									"zoomLevel": zoom,
									"neLat": NE.lat(),
									"neLong": NE.lng(),
									"swLat": SW.lat(),
									"swLong": SW.lng(),
									"center": { lat: center.lat(), lng: center.lng() }
								};
								$('#mapRefresh').show();
							});
							
							google.maps.event.addListener(map, 'zoom_changed', function() {
								switch(map.getZoom()) {
									case 6: countyLayer.setMap(map);
									 break;
									case 5: countyLayer.setMap(null);
									 break;
									case 8: if (_countyListener) {
												_countyListener.remove();
												_countyListener = null;
											}
											_.each(_countyLabels, function (label) {
												label.setMap(null);
											});
											break;
									case 9: if (!_countyListener) {
												_countyListener = google.maps.event.addListener(map, 'bounds_changed', function () {
													_.each(_countyLabels, function (label) {
														if(map.getBounds().contains(label.position)) {
															if (label.map == null) {
																label.setMap(map);
															}
														}
														else {
															label.setMap(null);
														}
													});
												});
											}
											break;
									}
								});

								// Create Sidebar rows, tables

								function createSidebarTableHeader(tableId, numCols, headers) {
									var headerRow = "<tr>";
									var i = 0;
									for (i; i < numCols; i++) {
										if (headers && headers.length > 0 && headers[i]) {
											headerRow += "<th>" + headers[i] + "</th>";
										}
										else {
											headerRow += "<th></th>";
										}
									}
									headerRow += "</tr>";
									$('#'+tableId).append($(headerRow));
								}

								function createSidebarTableRow(tableId, numCols, headers) {
									var tableRow = "<tr>";
									var i = 0;
									for (i; i < numCols; i++) {
										if (headers && headers.length > 0 && headers[i]) {
											tableRow += "<td>" + headers[i] + "</td>";
										}
										else {
											tableRow += "<td></td>";
										}
									}
									tableRow += "</tr>";
									$('#'+tableId).append($(tableRow));
								}

								// End Sidebar functionality

								// KML Piece
								var _presentKMLLayers = [];
								var _layersClickedOnce = [];
								var _layerRetries = 0;

								function setKMLLayer(kmlId) {
									//All US Rail Networks
									if (kmlId === 0) {
										//First time click
										if (!usRailsAdded() && !hasBeenClicked(kmlId)) {
											$('#KMLLayerCheckBox'+kmlId).css("color", "rgb(247, 149, 72)");
											for (var i = 0; i < 4; i++) {
												loadLayer(i);
											}
											_layersClickedOnce.push(0)
										}
										//Toggle attributes if not first click
										else {
											$('#KMLLayerCheckBox' + kmlId).css("color", (layerIsSelected(kmlId) ? "rgb(188, 189, 192)" : "rgb(247, 149, 72)"));
											_.each(_presentKMLLayers, function (loc) {
												if (loc.kmlId === 0 || loc.kmlId === 1 || loc.kmlId === 2 || loc.kmlId === 3) {
													loc.checked = !loc.checked;
													loc.checked ? loc.kmlLayer.setMap(map) : loc.kmlLayer.setMap(null);
												}
											});
										}
									}
									else if (kmlId === 6) {
										//First time click
										if (!usRailsAdded() && !hasBeenClicked(kmlId)) {
											$('#KMLLayerCheckBox' + kmlId).css("color", "rgb(247, 149, 72)");
											for (var i = 6; i < 15; i++) {
												loadLayer(i);
											}
											_layersClickedOnce.push(6)
										}
										//Toggle attributes if not first click
										else {
											$('#KMLLayerCheckBox' + kmlId).css("color", (layerIsSelected(kmlId) ? "rgb(188, 189, 192)" : "rgb(247, 149, 72)"));
											_.each(_presentKMLLayers, function (loc) {
												if (loc.kmlId > 5 && loc.kmlId < 15) {
													loc.checked = !loc.checked;
													loc.checked ? loc.kmlLayer.setMap(map) : loc.kmlLayer.setMap(null);
												}
											});
										}
									}
									//Other networks
									else {
										//First click
										if (!layerAdded(kmlId) && !hasBeenClicked(kmlId))
										{
											$('#KMLLayerCheckBox' + kmlId).css("color", "rgb(247, 149, 72)");
											loadLayer(kmlId);
											_layersClickedOnce.push(kmlId);
										}
										//Toggle attributes if not first click
										else {
											//Grab the layer, only reverse attributes if layer exists; if not, just toggle the selection in dropdown
											var loc = _.find(_presentKMLLayers, function (layer) { return layer.kmlId === kmlId });
											if (loc) {
												toggleAttributes(loc, kmlId);
											}
											else {
												toggleSelected(kmlId);
											}
										}

									}
								}

								//Check if the layer has been loaded successfully
								function layerAdded(kmlId) {
									return _.find(_presentKMLLayers, function (layer) { return layer.kmlId === kmlId }) ? true : false;
								}

								//Check if the layer is selected in the dropdown
								function layerIsSelected(kmlId) {
									//If a US rail, check if 0 is selected
									if(kmlId > 5 && kmlId < 15){
										kmlId = 6;
									}
									else if (kmlId < 4){
										kmlId = 0;
									}
									return $('#KMLLayerCheckBox'+kmlId).css("color") === "rgb(247, 149, 72)";
								}

								//Check that at least one layer exists, showing this has been called before
								function usRailsAdded() {
									return _.find(_presentKMLLayers, function (layer) {
										return layer.kmlId === 0 || layer.kmlId === 1 || layer.kmlId === 2 || layer.kmlId === 3
									}) ? true : false;
								}

								//Check if the layer has been selected at least one time
								function hasBeenClicked(kmlId) {
									return _layersClickedOnce.indexOf(kmlId) > -1;
								}

								//Reverse the current attributes of the layer
								function toggleAttributes(loc, kmlId) {
									$('#KMLLayerCheckBox' + kmlId).css("color", (layerIsSelected(kmlId) ? "rgb(188, 189, 192)" : "rgb(247, 149, 72)"));
									loc.checked = !loc.checked;
									loc.checked ? loc.kmlLayer.setMap(map) : loc.kmlLayer.setMap(null);
								}

								//Reverse the visibility of the check mark on the dropdown, either 'selecting' or 'unselecting' it.
								function toggleSelected(kmlId) {
									$('#KMLLayerCheckBox' + kmlId).css("color", (layerIsSelected(kmlId) ? "rgb(188, 189, 192)" : "rgb(247, 149, 72)"));
								}

								function clearKmlLayers() {
									$('[id^="KMLLayerCheckBox"]').each(function (item) {
										$(this).css("visibility", "hidden");
									});
									_.each(_presentKMLLayers, function (layer) {
										layer.kmlLayer.setMap(null);
										layer.checked = false;
									});
								}

								function loadLayer(id) {
									_isProductionExport = 1;
									return $.ajax({
										url: "/KMLHandler.ashx?id=" + id + "&username=" + prism.user.userName,
										//data: { "id": id },
										method: "POST",
										dataType: "JSON"
									}).done(function (data) {
										if (data.success) {
											//var longUrl= "http://" + location.host + "/Explorer/ReturnKmlLayer?token=" + encodeURIComponent(data.token);
											// Use for the KML in Sisense
											var longUrl = "http://" + location.host.substring(0, location.host.length - 5) + "/Explorer/ReturnKmlLayer?token=" +  encodeURIComponent(data.token);
											var request = gapi.client.urlshortener.url.insert({
												'resource': {
													'longUrl': longUrl
												}
											});
											request.execute(function(response)
											{
												if (response && response.id) {
													var kmlUrl = response.id;
													var kmlLayer = new google.maps.KmlLayer({
														url: kmlUrl,
														map: map,
														preserveViewport: true
													});

													//Error handling
													//If fails, just try again, up to 10 times
													setTimeout(function () {
														if (kmlLayer.getStatus() && kmlLayer.getStatus() === "OK") {
															var item = {
																kmlLayer: kmlLayer,
																kmlId: id,
																checked: true
															};
															if (!layerIsSelected(id)) {
																item.kmlLayer.setMap(null);
																item.checked = false;
															}
															_presentKMLLayers.push(item);
														}
														else {
															if (_layerRetries < 10) {
																console.warn('KML layer not added [' + id + ']. Trying again.');
																loadLayer(id);
																_layerRetries += 1;
															}
														}
													}, 30000);
												}
												else {
													console.warn('Google API failed.');
												}
											});
										}
									});
								}


								var kmlLayers = [
									{
										id: 5,
										title: 'Proppant Mine Locations'
									},
									{
										id: 4,
										title: 'Transload Terminal Locations'
									},
									{
										id: 0,
										title: 'US Rail Network'
									},
									{
										id: 6,
										title: 'Eagleford Basin'
									}
								];

								var _kmlControlsShowing = false;
								function CenterControl(controlDiv, map) {

									// Set CSS for the control border.
									var control = document.createElement('div');
									control.id = "KMLLayerButtonGroup";
									controlDiv.appendChild(control);

									// Set list
									var ul = document.createElement('ul');
									ul.className = "dropdown-memu";

									var controlHide = document.createElement('li');
									controlHide.id = "KMLLayerButtonGroupHide";
									controlHide.innerHTML = "KML Layer Selection"

									var iRight = document.createElement('i');
									iRight.className = "fa fa-chevron-down";
									controlHide.appendChild(iRight);

									ul.appendChild(controlHide);

									controlHide.addEventListener('click', function () {
										if (_kmlControlsShowing) {
											iRight.className = "fa fa-chevron-down";
											var x = document.getElementsByClassName("kmlItem");
											var i;
											for (i = 0; i < x.length; i++) {
												x[i].style.display = "none";
											}
											_kmlControlsShowing = false;
										}
										else {
											iRight.className = "fa fa-chevron-up";
											var x = document.getElementsByClassName("kmlItem");
											var i;
											for (i = 0; i < x.length; i++) {
												x[i].style.display = "";
											}
											_kmlControlsShowing = true;
										}
									});

									_.each(kmlLayers, function (layer) {
										var li = document.createElement('li');
										li.className = "kmlItem"
										li.style.display = "none";
										var a = document.createElement('a');
										a.id = "KMLLayerCheckBox" + layer.id;

										// Setup the click event listeners: simply set the map to Chicago.
										a.addEventListener('click', function () {
											setKMLLayer(layer.id);
										});

										a.innerHTML = layer.title;

										li.appendChild(a);
										ul.appendChild(li);
									});

									control.appendChild(ul);

								}

								var controlDiv = document.createElement('div');
								CenterControl(controlDiv, map);
								controlDiv.index = 1;
								map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
							});
						});

					});
				});
			});
		}
		if(typeof google != "undefined"){
			// first call to onGoogleMapLoaded is done when google maps loaded once loaded, render will call onGoogleMapLoaded - its done to avoid multiple invocation of onGoogleMapLoaded
			window.onGoogleMapLoaded();
		}
	},

	destroy : function (s, e) {}
});