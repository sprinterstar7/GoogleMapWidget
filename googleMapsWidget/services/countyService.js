mod.service('countyService', [

    function() {
        
        var self = this;

        //Define your private variables
        var countyLabels = [], 
        widgetMap, google, map,
        _countyListener = null,
        countyLabels, countyLayer;

        //Define an object of functions to return
        var serviceFunctions =  { 

            //Let's try to keep a convention of running any startup script, variable population, etc... 
            //in an init function.  
            init: function(inWidgetMap, inGoogle) { 
                map = widgetMap = inWidgetMap,
                google = inGoogle; 

                google.load('visualization', '1.0',
                {
                    packages: ['corechart', 'table', 'geomap'],
                    callback: serviceFunctions.initializeCountyNames
                });

                // County lines and labels
                if (!countyLayer) {
                    countyLayer = new google.maps.FusionTablesLayer({
                        query: {
                            select: 'geometry, County Name',
                            from: '1xdysxZ94uUFIit9eXmnw1fYc6VcQiXhceFd_CVKa'
                        },
                        suppressInfoWindows: true,
                        styles: [{
                            polygonOptions: {
                                fillColor: '#0000FF',
                                fillOpacity: 0.01,
                                strokeColor: '#fc9c46'
                            }
                        }]
                    });
                }

                google.maps.event.addListener(widgetMap, 'zoom_changed', function() {
                    switch(map.getZoom()) {
                        case 6: countyLayer.setMap(map);
                            break;
                        case 5: countyLayer.setMap(null);
                            break;
                        case 8: if (_countyListener) {
                            _countyListener.remove();
                            _countyListener = null;
                        }
                            _.each(countyLabels, function (label) {
                                label.setMap(null);
                            });
                            break;
                        case 9: if (!_countyListener) {
                            _countyListener = google.maps.event.addListener(map, 'bounds_changed', function () {
                                _.each(countyLabels, function (label) {
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

                if(map.getZoom() >= 6){
                    countyLayer.setMap(map);
                }
                
            },

           initializeCountyNames: function() {
                //3215 is the number of counties in this table
                //TOP 500 is hard limit imposed by google.
                //Iterate results 500 at a time by using OFFSET and LIMIT
                for (var i = 0; i < 7; i ++) {
                    var tableId = "1xdysxZ94uUFIit9eXmnw1fYc6VcQiXhceFd_CVKa";
                    var queryStr = "SELECT 'State-County', geometry FROM " + tableId + " OFFSET " + (i * 500) + " LIMIT 500";
                    var queryText = encodeURIComponent(queryStr);
                    var query = new google.visualization.Query('http://www.google.com/fusiontables/gvizdata?tq=' + queryText);
                    query.send(serviceFunctions.displayCountyText);
                }

                if(map.getZoom() >= 9) { 
                    if (!_countyListener) {
                        _countyListener = google.maps.event.addListener(map, 'bounds_changed', function () {
                            _.each(countyLabels, function (label) {
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
                }
            },

            displayCountyText: function(response) {
                var currentZoom = map.getZoom();
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
                    countyLabels.push(mapLabel);
                    if(currentZoom >= 9 && map.getBounds().contains(mapLabel.position)){
                        mapLabel.setMap(map);
                    }
                }
            }
        
        }

        return serviceFunctions;

    }
]);