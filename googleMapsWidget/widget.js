
var mapupdater;

prism.run(['plugin-googleMapsWidget.services.helperService', 'plugin-googleMapsWidget.services.legendsService', 
	'plugin-googleMapsWidget.services.kmlService', 'plugin-googleMapsWidget.services.countyService', 
	'plugin-googleMapsWidget.services.drawingService', 'plugin-googleMapsWidget.services.staticOverlayService', 
	'plugin-googleMapsWidget.services.mapStyleService', 
	//'plugin-googleMapsWidget.services.heatmapService', 
	function($helperService, $legendsService, $kmlService, $countyService, $drawingService, $staticOverlayService, $mapStyleService) {//, $heatmapService) {
	prism.registerWidget("googleMaps", {

		name : "googleMaps",
		family : "maps",
		title : "Google Maps",
		iconSmall : "/plugins/googleMapsWidget/resources/images/widget-24.png",
		hideNoResults: true,
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
					visibility: function() { return false},
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
					name : 'shape',
					type : 'visible',
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

			canShape: function (widget, panel, item) {
				return panel.name === "shape";
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

				// shape by
				else if (!prism.$jaql.isMeasure(metadataItem) && widget.metadata.panel("shape").items.length === 0) {

					return "shape";
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
				if (a.measures.length == 1) {
				//if (a.dimensions.length >= 2 && a.measures.length == 1) {
					return 0;
				}
				return -1;
			},

			// populates the metadata items to the widget
			populateMetadata : function (widget, items) {

				var a = prism.$jaql.analyze(items);

				if (a.dimensions.length < 2) {
					a.dimensions = [];
					a.dimensions.push({
							"jaql": {"table":"Well","column":"GeocodeLt0","dim":"[Well.GeocodeLt0]","datatype":"numeric","title":"GeocodeLt0"}
						});
					a.dimensions.push({
							"jaql": {"table":"Well","column":"GeocodeLg0","dim":"[Well.GeocodeLg0]","datatype":"numeric","title":"GeocodeLg0"}
						}
					);
				}

				// allocating dimensions
				widget.metadata.panel("latlng").push(a.dimensions);
				widget.metadata.panel("value").push(a.measures);
				widget.metadata.panel("color").push(a.color);
				widget.metadata.panel("shape").push(a.shape);
				widget.metadata.panel("details").push(a.details);
				widget.metadata.panel("filters").push(a.filters);
			},

			// builds a jaql query from the given widget
			buildQuery : function (widget) {

				if(widget.fromReadjust) { 
					return widget.queryResult;
				}
				else { 
					var query = {
						datasource : widget.datasource,
						metadata : []
					};

					query.count = 15000;//0;
					query.offset = 0;

					var countQuery = {
						datasource : widget.datasource,
						metadata : []
					};
					countQuery.metadata.push({
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

							"title": "Well Count"
						}
					});
					var i = 0;
					for(; i<3; i++) {
						countQuery.metadata.push({
							"jaql": {
								"formula":"COUNT(lt)",
								"context": {
									"[lt]" : {
										"table": "Well",
										"column": "GeocodeLt" + i,
        								"dim": "[Well.GeocodeLt" + i + "]",
										"datatype": "numeric"
									}
								},

								"title": "GeocodeLt" + i + " Count"
							}
						});
						countQuery.metadata.push({
							"jaql": {
								"formula":"COUNT(lg)",
								"context": {
									"[lg]" : {
										"table": "Well",
										"column": "GeocodeLg" + i,
        								"dim": "[Well.GeocodeLg" + i + "]",
										"datatype": "numeric"
									}
								},

								"title": "GeocodeLg" + i + " Count"
							}
						});
					}

					// pushing items
					widget.metadata.panel("latlng").items.forEach(function (item) {

						query.metadata.push(item);
					});

					// pushing data
					query.metadata.push(widget.metadata.panel("value").items[0]);

					// pushing color
					var colorPanel = widget.metadata.panel("color");
					if (colorPanel && colorPanel.items.length > 0) {
						query.metadata.push(colorPanel.items[0])
					}

					// pushing shape
					var shapePanel = widget.metadata.panel("shape");
					if (shapePanel && shapePanel.items.length > 0) {
						query.metadata.push(shapePanel.items[0])
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
						countQuery.metadata.push({"panel": "scope", "jaql": item.jaql});
					});

					// Dashboard filters
					prism.activeDashboard.filters.flatten().forEach(function (object) {
						object.panel = "scope";
						countQuery.metadata.push(object);
					});

					$.ajax({
						type: 'POST',
						url: encodeURI('/api/datasources/' + widget.datasource.title + '/jaql'),
						data: JSON.stringify(countQuery),
						success: function(data) {
							if(data.error) { 
								$staticOverlayService.removeOverlay();
							}
							else { 
								var result = data.values[0];
								var count = (result.length === undefined) ? result.data : result[0].data;
								var column;
								if (count > query.count) {
									try {
										if (colorPanel && colorPanel.items.length > 0) query.metadata.splice(3,1);
										if (shapePanel && shapePanel.items.length > 0) query.metadata.splice(3,1);
										if(detailsPanel){
											query.metadata.splice(3, detailsPanel.items.length);
										}

										var lv0 = Math.max(data.values[1].data, data.values[2].data),
											lv1 = Math.max(data.values[3].data, data.values[4].data),
											lv2 = Math.max(data.values[5].data, data.values[6].data);
										
										switch(widget.mapSettings.zoomLevel)
										{
											case 1:
											case 2:
											case 3:
											case 4:
											case 5: 
											case 6:
											case 7: column = ( lv2 <= 1000 ) ? "2" : ( lv1 <= 1000 ) ? "1" : "0";
												break;
											case 8:
											case 9:
											case 10:
											case 11:
											case 12: 
											case 13:
											case 14: column = ( lv2 <= 10000 ) ? "2" : ( lv1 <= 10000 ) ? "1" : "0";
												break;
											case 15:
											case 16: 
											case 17:
											case 18: 
											case 19:
											case 20: column = ( lv2 <= 25000 ) ? "2" : ( lv1 <= 25000 ) ? "1" : "0";
												break;
											default: // Map's first load
												column = "0";
												break;
										}
									}
									catch(err) { column = "0";};

									query.metadata[0].jaql.column = "GeocodeLt" + column;
									query.metadata[0].jaql.title = "GeocodeLt" + column;
									query.metadata[0].jaql.dim = "[Well.GeocodeLt" + column + "]";
									query.metadata[1].jaql.column = "GeocodeLg" + column;
									query.metadata[1].jaql.title = "GeocodeLg" + column;
									query.metadata[1].jaql.dim = "[Well.GeocodeLg" + column + "]";
									query.metadata.push({ 
										"jaql": {
											"formula": "COUNT(Id)",
											"context": {
											"[Id]": {
												"table": "Well",
												"column": "Well Unique Id",
												"dim": "[Well.Well Unique Id]",
												"datatype": "numeric"
											}
											},
											"title": "Well Count"
										}
									});
								}
								else { 						
									query.metadata[0].jaql.column = "Latitude";
									query.metadata[0].jaql.title = "Latitude";
									query.metadata[0].jaql.dim = "[Well.Latitude]";
									query.metadata[1].jaql.column = "Longitude";
									query.metadata[1].jaql.title = "Longitude" ;
									query.metadata[1].jaql.dim = "[Well.Longitude]";

								}
							}
						},
						dataType: 'json',
						async: false,
						timeout: 30000
					});
					
					return query;
				}			
			
			},

			// prepares the widget-specific query result from the given result data-table
			processResult : function (widget, queryResult) {
				// request google maps
				if(typeof google == "undefined"){
					$.ajax({
						type : "GET",
						url : 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCKFgS1fJWpAgMHLh4wwBNvz0yO5PXV0lc&libraries=places,drawing,geometry,visualization&callback=onGoogleMapLoaded',
						dataType : "script",
						cache : true
					});
				}
				if($('#mapOverlay').length > 0) { 
					$staticOverlayService.removeClickFromOverlay();
				}
				return queryResult;
			}
		},

		//Have to do this in case query errors out, makes the div able to click-through momentarily
		querystart : function (widget) { 
			if($('#mapOverlay').length > 0) { 
				$staticOverlayService.addClickToOverlay();
			}
		},

		render : function (s, e) {
			var map;
			var boundsChangedOnce = false;

			var googleMapFilters = {
				SHAPES: 0,
				BOUNDS: 1
			};

			var externalPaths = {
				markerclusterer: '://rawgit.com/googlemaps/js-marker-clusterer/gh-pages/src/markerclusterer.js',
				infobox: '://rawgit.com/googlemaps/v3-utility-library/master/infobox/src/infobox.js',
				overlappingMarkerSpiderfier: '://jawj.github.io/OverlappingMarkerSpiderfier/bin/oms.min.js',
				maplabel: '://rawgit.com/googlemaps/js-map-label/gh-pages/src/maplabel-compiled.js',
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
					$.getScript("https://www.google.com/jsapi", function(data, textStatus) {
						$.getScript(protocol + externalPaths.markerclusterer, function (data, textStatus) {
							$.getScript(protocol + externalPaths.infobox, function (data, textStatus) {
								$.getScript(protocol + externalPaths.overlappingMarkerSpiderfier, function (data, textStatus) {
									$.getScript(protocol + externalPaths.maplabel, function (data, textStatus) {
										gapi.client.setApiKey('AIzaSyBng-i-_-yfQdfS5COep3e3oV6kQOjwEuA');
										gapi.client.load('urlshortener', 'v1', function () { });

										//	All 3 scripts loaded, Get the data
										var qresult = s.queryResult.$$rows; // results
										var headers = s.rawQueryResult.headers; // headers

										/*
										 * Widget scope Variables
										 */

										// Shape overlays
										var overlays = [];

										if(e.widget.queryMetadata) {
											//Do nothing
										} else {
											e.widget.queryMetadata = { };
											e.widget.changesMade();
										}

										if(e.widget.queryMetadata.overlays) {
											overlays = e.widget.queryMetadata.overlays;
										};

										var colorCategory;
										if(e.widget.metadata.panel('color') && e.widget.metadata.panel('color').items[0] && e.widget.metadata.panel('color').items[0].jaql && e.widget.metadata.panel('color').items[0].jaql.column) {
											colorCategory = e.widget.metadata.panel('color').items[0].jaql.column;
										}

										var shapeCategory;
										if(e.widget.metadata.panel('shape') && e.widget.metadata.panel('shape').items[0] && e.widget.metadata.panel('shape').items[0].jaql && e.widget.metadata.panel('shape').items[0].jaql.column) {
											shapeCategory = e.widget.metadata.panel('shape').items[0].jaql.column;
										}

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
										if(e.widget.mapSettings) {
										} else {
											e.widget.mapSettings = {
												"zoomLevel": 4,
												"center": { lat: 37.09024, lng: -95.712891 }
											};
										}

										var myOptions = {
											//mapTypeId : google.maps.MapTypeId.DARK,
											zoom: e.widget.mapSettings.zoomLevel,
											center: { lat: e.widget.mapSettings.center.lat, lng: e.widget.mapSettings.center.lng },
											mapTypeControlOptions: {
												mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain', 'dark', 'light']
											}
										};
										var widgetMap = getWidgetMap(e.widget.oid);

										if (!widgetMap) { // Initialize initial map controls
											widgetMap = new google.maps.Map($lmnt[0], myOptions); // element is jquery element but we need dom element as map container hence the accessor
											widgetMap.mapTypes.set('dark', $mapStyleService.getDarkTheme());
											widgetMap.mapTypes.set('light', $mapStyleService.getLightTheme());
											widgetMap.setMapTypeId('light');
											setWidgetMap(e.widget.oid,widgetMap);
											
											/*
											 * Map bound update events
											 */

											$staticOverlayService.init(widgetMap, google);

											google.maps.event.addListener(widgetMap, 'bounds_changed', setMapTimer);

											$kmlService.init(widgetMap, google, protocol);
											$countyService.init(widgetMap, google, protocol);
											$drawingService.init(widgetMap, google, e);
											//$heatmapService.init(widgetMap, google, e);						

											google.maps.event.addListener(widgetMap, 'maptypeid_changed', function(e) { 
												$drawingService.changeRulerColor(widgetMap.getMapTypeId());
											});																							
											
											google.maps.event.addListenerOnce(widgetMap, 'idle', function () { // Create Widget's Refresh button
												
											if ($('#mapRefresh').length < 1) {

													var mapRefreshButton = $('<div id="mapRefresh" title="Refresh Results" data-html2canvas-ignore="true">' +
														'<div class="update-icon"></div>' +
														'</div>');

													widgetMap.controls[google.maps.ControlPosition.RIGHT].push(mapRefreshButton[0]);

													$('#mapRefresh').on('mouseover', function () {
														$('#mapRefresh a i').addClass('fa-spin').addClass('fa-fw');
													});
													$('#mapRefresh').on('mouseout', function () {
														$('#mapRefresh a i').removeClass('fa-spin').removeClass('fa-fw');
													});

													$('#mapRefresh').on('click', function () {
														$staticOverlayService.addOverlay();
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
																"filter":
																{
																	"from": (SW.lng() > NE.lng()) ? -180 : SW.lng(),
																	"to":  NE.lng(),
																}
															}
														};

														var options = {
															save: true,
															refresh: false
														};

														if ($$get(e.widget,'googleMapFilters.shapes')){
															var wellField = $$get(e.widget,'googleMapFilters.shapes');

															if (!$$get(wellField,"jaql.filter.or") || $$get(wellField,"jaql.filter.or").length == 0){

																delete wellField.jaql.filter.filter;
																try{
																	prism.activeDashboard.filters.remove(wellField,options);
																} catch (Error) {
																	console.log("filter 'well unique id' does not exist on the dashboard");
																}
															} else {
																prism.activeDashboard.filters.update(e.widget.googleMapFilters.shapes,options);
															}

															delete e.widget.googleMapFilters.shapes;
														}

														//  Set via JavaScript API
														prism.activeDashboard.filters.update(lat,options);
														prism.activeDashboard.filters.update(long,options);

														prism.activeDashboard.$dashboard.updateDashboard(prism.activeDashboard,"filters");

														//  Make sure the widgets get refreshed
														var refreshDashboard = function(){
															$.each(prism.activeDashboard.widgets.$$widgets,function(){
																this.refresh();
															})
														};

														e.widget.changesMade();

														setTimeout(refreshDashboard,100);
													});

													$('#mapRefresh').hide();
												}
											});

											$drawingService.drawShapesFromMetaData(overlays);

										}

										map = widgetMap;										

										//	Create an object to handle multiple markers at the same coordinates
										var omsOptions = {
											markersWontMove : true,
											markersWontHide : true,
											keepSpiderfied : true
										};
										var oms = new OverlappingMarkerSpiderfier(map, omsOptions);

										//	Define the info window for popups
										var infowindow = new google.maps.InfoWindow();

										//	Init Variables
										var shapesMetadata = [];
										var savedShapesCategory;

										
			
										var isCluster = headers[0].indexOf("Geocode") > -1;
										var shapeArray = [];
										var colorArray = [];
										if(!isCluster) { 
											shapeArray = _.map(qresult, function(item){
												return item[4] && item[4].data ? item[4].data : (item[3] && !item[3].color && item[3].data ? item[3].data : null) ;
											});
											colorArray = _.map(qresult, function(item){
												return item[3] && item[3].data && item[3].color? { value: item[3].text, color: item[3].color , selector: item[3].text.replace(/\W/g, '')} : null;
											});
											colorArray = _.uniq(colorArray, function(item) {
												return JSON.stringify(item);
											});
											if (colorArray[0]) {
												colorArray = _.sortBy(colorArray, function(item) {
													return (item !== null) ? item.value.toUpperCase() : null;
												});
											}
											colorArray = _.compact(colorArray);
											shapeArray = _.uniq(shapeArray);
											shapeArray = shapeArray.sort();
											shapeArray = _.compact(shapeArray);
										}
										
										google.maps.Map.prototype.getMarkers = function() {
											return this.markers;
										};

										google.maps.Map.prototype.clearMarkers = function() {
											for(var i=0; i<this.markers.length; i++){
												this.markers[i].marker.setMap(null);
											}
											this.markers = new Array();
										};

										map.markers = map.markers || [];
										google.maps.event.trigger(map, 'resize');										

										var i = 0,
											dataSize = qresult.length,
											j,
											headersSize = headers.length,
											markers = map.markers,
											markerText,
											clusterLabel = '',
											colors = { "#00A0DC": testMarker };

										if(e.widget.queryMetadata.savedShapes) {
											shapesMetadata = e.widget.queryMetadata.savedShapes;
										};

										if(shapesMetadata) {
											savedShapesCategory = _.find(shapesMetadata, function(category){
												return category.column == shapeCategory;
											})
										}
										
										if(!s.fromReadjust) { 
											map.clearMarkers();
											markers = [];
											//$heatmapService.clear();
											var maxValue = 0;
											//	Create each marker for the map
											for (; i < dataSize; i++) {

												//	Define the info window HTML
												markerText = '<span class="markerInfoBox" style="font-family:arial,sans-serif; line-height:150%;" '
													+ ' onclick="google.maps.closeInfoWindow()" >'
													+ '<span style="line-height:200%;font-size:120%;text-decoration:underline"><b>'
													+ 'INFO' + '</b></span>';

												//	Add the rest of data to be presented in the info window
												var measureIndex = 2;
												j = measureIndex;
												var headersAdded = [];
												for (; j < headersSize; j++) {
													if(headersAdded.indexOf(headers[j]) == -1) { 
														markerText += '<br><span>' + headers[j] + ': ' + qresult[i][j]["text"] + '</span>';
														headersAdded.push(headers[j]);
													}
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

												var url;
												var pinColor = '#00A0DC';
												var shape = "circle";

												if(isCluster) { 
													var count = qresult[i][3].data;
													if(count >= 1 && count < 10) { 
														url = "/plugins/googleMapsWidget/resources/markerclusterer/images/m1.png";
													}
													else if(count >= 10 && count < 100) { 
														url = "/plugins/googleMapsWidget/resources/markerclusterer/images/m2.png";
													}
													else if(count >= 100 && count < 1000) { 
														url = "/plugins/googleMapsWidget/resources/markerclusterer/images/m3.png";
													}	
													else if(count >= 1000 && count < 10000) { 
														url = "/plugins/googleMapsWidget/resources/markerclusterer/images/m4.png";
													}
													else { 
														url = "/plugins/googleMapsWidget/resources/markerclusterer/images/m5.png";
													}
													/*$heatmapService.push({
														location: new google.maps.LatLng(lat, lng),
														weight: qresult[i][measureIndex]["data"]
													});*/
												}
												else { 
													//	Determine the marker color from Sisense, or use the default
													if ((headersSize >= 3) && (qresult[i][3]) && (qresult[i][3].color)) {
														pinColor = qresult[i][3].color;//.replace("#","");
														if ( colors[pinColor] === undefined && !shapeCategory )
															colors[pinColor] = createMarker(10, pinColor);
													}

													var shapeData = (shapeCategory && (headersSize >= 4) && (qresult[i][4]) && (qresult[i][4].data)) 
																		? qresult[i][4].data
																		: (shapeCategory && (headersSize >= 3) && (qresult[i][3]) && (qresult[i][3].data) && !(qresult[i][3].color)) 
																			? qresult[i][3].data
																			: null;

													var hasSavedShape = shapeData && savedShapesCategory

													if(hasSavedShape) {
														var item = _.find(savedShapesCategory.items, function(item) {
															return item.value == shapeData;
														});
														if(item) {
															shape = item.shape;
														}
													}

													/*$heatmapService.push({
														location: new google.maps.LatLng(lat, lng),
														weight: qresult[i][measureIndex]["data"]
													});*/
												}

												// Create the marker
												var marker = new google.maps.Marker({
													map : /*$heatmapService.isToggled() ? null :*/ map,
													position : new google.maps.LatLng(lat, lng),
													raiseOnDrag : false,
													visible : true,
													draggable : false,
													icon: (isCluster) ? { url : url
														, anchor: new google.maps.Point(10, 10) } 
													: (shapeCategory) ? { url: "/ColoredShapeHandler.ashx?shape=" + shape + "&color=FF" + pinColor.replace('#', '')
														, anchor: new google.maps.Point(10, 10) } 
													: colors[pinColor],
													title : qresult[i][measureIndex]["text"], // the formatted value of each marker
													value : qresult[i][measureIndex]["data"] // the value of each marker
												});
												if (qresult[i][measureIndex]["data"] > maxValue) maxValue = qresult[i][measureIndex]["data"];
												//	Add data to the marker
												marker.sisenseTooltip = markerText;

												// Add marker to oms
												oms.addMarker(marker);

												markers.push({
													marker : marker,
													color: pinColor,
													shape : shapeData
												});

												if(hasSavedShape) {
													var item = _.find(savedShapesCategory.items, function(item){
														return item.value == shapeData;
													});
													if(item) {
														item.shape = shape;
													}
													else {
														savedShapesCategory.items.push({
															value : shapeData,
															shape : shape
														})
													}
												}
												else if (shapeData) {
													var cat = {
														column : shapeCategory,
														items : [{
															value : shapeData,
															shape : shape
														}]
													}
													shapesMetadata = [];
													shapesMetadata.push(cat);
													savedShapesCategory = cat;
												}
											}
											//END for
											map.markers = markers;

											/*if($heatmapService.isToggled()) { 	
												console.log('applied');
												$heatmapService.apply(maxValue);
											}*/
											
											$staticOverlayService.removeOverlay();
										}
										else { 
											s.fromReadjust = false;
										}

										// Update saved marker shapes and then proceed to update 'Color By' and 'Shape By' Legends
										e.widget.queryMetadata.savedShapes = shapesMetadata;
										e.widget.changesMade();

										oms.addListener('click', function(marker, event) {		
											infowindow.setContent(marker.sisenseTooltip);
											infowindow.open(map, marker);
										});
						
										if ($('#mapSidebar').length < 1) 
											$legendsService.init((!colorArray || colorArray.length == 0) ? "Well Count" : colorCategory, shapeCategory, shapesMetadata, map, e, markers);//, $heatmapService);
										else { 
											$legendsService.clear((!colorArray || colorArray.length == 0) ? "Well Count" : colorCategory, shapeCategory)
											$legendsService.setMarkers(markers);
										}

										if(shapeArray) {
											$legendsService.addRowsToShapeBy(shapeArray);
										}

										if(!colorArray || colorArray.length == 0) {
											$legendsService.addRowsToClusterLegend();
										}
										else { 
											$legendsService.addRowsToColorLegend(colorArray);
										}

										$(map.getDiv()).on('DOMNodeInserted', 'div.gmnoprint', function () {
												$('.gmnoprint').attr("data-html2canvas-ignore", "true");
										});

										function setMapTimer() {
											clearTimeout(mapupdater);
											mapupdater = setTimeout(updateMapSettings, 500);
										}

										function updateMapSettings() {
                                            var bounds = map.getBounds(),
                                            NE = bounds.getNorthEast(),
                                            SW = bounds.getSouthWest(),
                                            zoom = map.getZoom(),
                                            center = map.getCenter();

                                            e.widget.mapSettings = {
                                                "zoomLevel": zoom,
                                                "neLat": NE.lat(),
                                                "neLong":  NE.lng(),
                                                "swLat": SW.lat(),
                                                "swLong":  SW.lng(),
                                                "center": { lat: center.lat(), lng: center.lng() }
                                            };

                                            if (boundsChangedOnce)
                                                $('#mapRefresh').show();
                                            else
                                                boundsChangedOnce = true;

											e.widget.changesMade();
                                        }	
										
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

		destroy : function (s, e) {},

		readjust : function(s, e){
			s.fromReadjust = true;
			$staticOverlayService.readjustOverlay();
		},
		
		initialized : function(s, e) { 
			s.fromReadjust = false;
		}
	});
}]);