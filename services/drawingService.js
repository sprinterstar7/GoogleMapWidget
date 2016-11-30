mod.service('drawingService', [

    function() {
        
        var self = this;

        //Define your private variables
        var overlays = [], _drawManager, 
        widgetMap, google, map, e;

        //Define an object of functions to return
        var serviceFunctions =  { 

            //Let's try to keep a convention of running any startup script, variable population, etc... 
            //in an init function.  
            init: function(inWidgetMap, inGoogle, inE) { 
                map = widgetMap = inWidgetMap,
                google = inGoogle,
                e = inE;

                /*
                * Draw Manager Control
                */
                widgetMap.drawManager = new google.maps.drawing.DrawingManager({
                    drawingControl: true,
                    drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [
                            google.maps.drawing.OverlayType.CIRCLE,
                            google.maps.drawing.OverlayType.RECTANGLE/*,
                            google.maps.drawing.OverlayType.POLYLINE*/
                        ]
                    },
                    circleOptions: {
                        fillColor: '#d22927',
                        fillOpacity: 0.5,
                        strokeWeight: 1,
                        strokeColor: '#cccccc',
                        clickable: true,
                        editable: false,
                        suppressUndo: true
                    },
                    rectangleOptions: {
                        fillColor: '#d22927',
                        fillOpacity: 0.5,
                        strokeWeight: 1,
                        strokeColor: '#cccccc',
                        clickable: true,
                        editable: false,
                        draggable: false,
                        suppressUndo: true
                    },
                    polylineOptions: {
                        fillColor: '#dddddd',
                        fillOpacity: 0.5,
                        strokeWeight: 3,
                        strokeColor: '#cccccc',
                        clickable: true,
                        editable: false,
                        draggable: true,
                        suppressUndo: true
                    }
                });
                widgetMap.drawManager.setMap(widgetMap);
            
                _drawManager = map.drawManager;
                
                google.maps.event.addListener(widgetMap.drawManager, 'overlaycomplete', function (event) {
                    var shoulsUpdatefilters = false,
                        dashfilters = prism.activeDashboard.filters.$$items;

                    var overlay;

                    if(event.dontAdd) {

                    }
                    else if(event.type != google.maps.drawing.OverlayType.POLYLINE) {
                        if(event.type == google.maps.drawing.OverlayType.RECTANGLE) {
                            var filter = _.find(dashfilters,function(item){
                                return serviceFunctions.compareRecFilter(item,event.overlay.bounds);
                            });

                            if (!filter){
                                shoulsUpdatefilters = true;
                            }

                            overlay = {
                                type: event.type,
                                bounds: event.overlay.bounds
                            }
                        }
                        else if(event.type == google.maps.drawing.OverlayType.CIRCLE) {
                            var filter = _.find(dashfilters,function(item){
                                return serviceFunctions.compareCircleFilter(item,event.overlay.radius,event.overlay.center.lat(),event.overlay.center.lng());
                            });

                            if (!filter){
                                shoulsUpdatefilters = true;
                            }

                            overlay = {
                                type: event.type,
                                radius: event.overlay.radius,
                                center: { lat: event.overlay.center.lat(), lng: event.overlay.center.lng() }
                            }
                        }
                        else if(event.type == google.maps.drawing.OverlayType.POLYGON) {
                            overlay = {
                                type: event.type,
                                latLngs: google.maps.geometry.encoding.encodePath(event.overlay.getPath().getArray())
                            }
                        }

                        overlays.push(overlay);
                        e.widget.queryMetadata.overlays = overlays;
                    }

                    if (shoulsUpdatefilters){
                        serviceFunctions.updateWellIDFilter(event,e.widget);
                    }

                    event.overlay.addListener('rightclick', function () {
                        serviceFunctions.eraseShape(event);
                    });
                });
            },

            drawShapesFromMetaData: function(inOverlays) { 
                overlays = inOverlays;
                if(overlays) { // Redraw shape overlays onto the map
                    _.each(overlays, function(overlay){
                        switch (overlay.type) {
                            case google.maps.drawing.OverlayType.CIRCLE:

                                var testCircle = new google.maps.Circle({
                                    center: serviceFunctions.getCircleCenterLatLng(overlay.center),
                                    radius: overlay.radius,
                                    fillColor: '#d22927',
                                    fillOpacity: .5,
                                    strokeWeight: 1,
                                    strokeColor: '#cccccc',
                                    clickable: true,
                                    editable: false,
                                    draggable: false,
                                    suppressUndo: true,
                                    map: map
                                });

                                var o = {
                                    overlay: testCircle,
                                    type: google.maps.drawing.OverlayType.CIRCLE,
                                    dontAdd: true
                                };
                                google.maps.event.trigger(_drawManager, 'overlaycomplete', o);
                                break;
                            case google.maps.drawing.OverlayType.RECTANGLE:

                                var rectBounds = serviceFunctions.getCoordinateLatLng(overlay.bounds);

                                var testRectangle = new google.maps.Rectangle({
                                    fillColor: '#d22927',
                                    fillOpacity: .5,
                                    strokeWeight: 1,
                                    strokeColor:'#cccccc',
                                    clickable: true,
                                    editable: false,
                                    draggable: false,
                                    suppressUndo: true,
                                    map: map,
                                    bounds: new google.maps.LatLngBounds(rectBounds[0], rectBounds[1])
                                });

                                var o = {
                                    overlay: testRectangle,
                                    type: google.maps.drawing.OverlayType.RECTANGLE,
                                    dontAdd: true
                                };

                                google.maps.event.trigger(_drawManager, 'overlaycomplete', o);
                                break;
                            case google.maps.drawing.OverlayType.POLYGON:

                                var testPolygon = new google.maps.Polygon({
                                    paths: google.maps.geometry.encoding.decodePath(overlay.latLngs),
                                    fillColor:  '#d22927',
                                    fillOpacity: .5,
                                    strokeWeight: 1,
                                    strokeColor: '#cccccc',
                                    clickable: true,
                                    editable: false,
                                    draggable: false,
                                    suppressUndo: true,
                                    map: map
                                });
                                var o = {
                                    overlay: testPolygon,
                                    type: google.maps.drawing.OverlayType.POLYGON,
                                    dontAdd: true
                                };
                                google.maps.event.trigger(_drawManager, 'overlaycomplete', o);
                                break;
                        }
                    })
                }
            },

            compareCircleFilter: function(wellIdFilterOrStatment,radius,latCenter,lngCenter){
                var circleFilter = serviceFunctions.createCircleFilter(latCenter,lngCenter,radius);

                return _.find($$get(wellIdFilterOrStatment,"jaql.filter.or"), function(filter){
                    return $$get(filter,"measure.formula") == circleFilter.measure.formula;
                });
            },

           compareRecFilter:  function(wellIdFilterOrStatment,recBounds){
                var latItem = serviceFunctions.getLatLngFieldFilter(recBounds.f.f,recBounds.f.b,"Latitude"),
                    lngItem = serviceFunctions.getLatLngFieldFilter(recBounds.b.b,recBounds.b.f,"Longitude");

                return _.find($$get(wellIdFilterOrStatment,"jaql.filter.or"), function(filter){
                    return $$get(filter,"and") && filter.and[0] && filter.and[1]
                        && JSON.stringify(filter.and[0]) ==  JSON.stringify(latItem)
                        && JSON.stringify(filter.and[1]) ==  JSON.stringify(lngItem);
                });
            },

            getCircleCenterLatLng: function(center) {
                return new google.maps.LatLng(center.lat, center.lng);
            },

            getCircleCenterLatLng: function(center) {
                return new google.maps.LatLng(center.lat, center.lng);
            },

            getCoordinateLatLng: function(bounds) {
                var toReturn = [];
                toReturn.push(new google.maps.LatLng(bounds.f.f, bounds.b.b));
                toReturn.push(new google.maps.LatLng(bounds.f.b, bounds.b.f));
                return toReturn;
            },

            eraseShape: function (event) {
                event.overlay.setMap(null);
                delete event;

                switch (event.type) {
                    case 'circle':
                        var center = { lat: event.overlay.center.lat(), lng: event.overlay.center.lng() };
                        var radius = event.overlay.radius;
                        overlays = _.reject(overlays, function(overlay) {
                            return overlay.type == 'circle'
                                && overlay.center.lat == center.lat
                                && overlay.center.lng == center.lng
                                && overlay.radius == radius;
                        });

                        serviceFunctions.removeWellIDFilter(e.widget,event)
                        break;
                    case 'rectangle':
                        overlays = _.reject(overlays, function(overlay) {
                            return overlay.type == 'rectangle'
                                && overlay.bounds.b.b == event.overlay.bounds.b.b
                                && overlay.bounds.b.f == event.overlay.bounds.b.f
                                && overlay.bounds.f.b == event.overlay.bounds.f.b
                                && overlay.bounds.f.f == event.overlay.bounds.f.f
                        });

                        serviceFunctions.removeWellIDFilter(e.widget,event);
                        break;
                    case 'polygon':
                        var path = google.maps.geometry.encoding.encodePath(event.overlay.getPath().getArray());
                        overlays = _.reject(overlays, function(overlay) {
                            return overlay.type == 'polygon'
                                && overlay.latLngs == path;
                        });
                        break;
                }

                e.widget.queryMetadata.overlays = overlays;

                $('#mapRefresh').show();
            },

            updateWellIDFilter: function(event, widget) {
                if (event.type == google.maps.drawing.OverlayType.RECTANGLE ||
                    event.type == google.maps.drawing.OverlayType.CIRCLE){
                    var wellFieldName = "Well Unique Id",
                        filterFields = prism.activeDashboard.filters.$$items,
                        bounds = event.overlay.bounds;


                    var wellField = $$get(widget,'googleMapFilters.shapes') || serviceFunctions.createDashFilter(wellFieldName,filterFields);

                    if (event.type == google.maps.drawing.OverlayType.RECTANGLE ){
                        serviceFunctions.addLatLngOrAttribute(wellField,bounds);
                    } else {
                        serviceFunctions.addCircleFilter(wellField,event);
                    }

                    $$set(widget,'googleMapFilters.shapes',wellField);
                    // var options = {
                    // 	save: false,
                    // 	refresh: false
                    // };

                    // prism.activeDashboard.filters.update(wellField,options);
                    $('#mapRefresh').show();
                }
            },

            addLatLngOrAttribute: function(wellField,bounds){
                var latItem = serviceFunctions.getLatLngFieldFilter(bounds.f.f,bounds.f.b,"Latitude"),
                    lngItem = serviceFunctions.getLatLngFieldFilter( bounds.b.b,bounds.b.f,"Longitude");

                wellField.jaql.filter.or.push({
                    "and":[latItem,lngItem]
                });
            },

            createDashFilter: function(name,filterFields,from,to){
                var field = serviceFunctions.getFieldFromItems(name, filterFields);

                if (!field) {
                    field = serviceFunctions.createFieldToFilterPanel(name);
                }

                return field;
            },

            addCircleFilter: function(wellField,event){
                wellField.jaql.filter.or.push(serviceFunctions.createCircleFilter(event.overlay.center.lat(),
                    event.overlay.center.lng(),
                    event.overlay.radius));
            },

            getFieldFromItems: function(field,items) {
                return _.find(items,function(item){
                    if($$get(item,"jaql.dim") &&
                        ((item.jaql.column).toLowerCase() ===  (field).toLowerCase())){
                        return item;
                    }
                });
            },

            createCircleFilter: function(centerLat,centerLng,radius) {
                return {
                    "measure": {

                        "formula":"ACOS(((SIN((" +centerLat + "*0.0174532925199433))*SIN(([lat]*0.0174532925199433)))+ (COS((" + centerLat + "*0.0174532925199433))*COS(([lat]*0.0174532925199433))*COS(([lng]*0.0174532925199433-" + centerLng + "*0.0174532925199433))))) *  6378.137 ",
                        "context": {
                            "[lng]": {
                                "table": "Well",
                                "column": "Longitude",
                                "dim": "[Well.Longitude]",
                                "datatype": "numeric",
                                "agg": "sum",
                                "title": "Total Longitude"
                            },
                            "[lat]": {
                                "table": "Well",
                                "column": "Latitude",
                                "dim": "[Well.Latitude]",
                                "datatype": "numeric",
                                "agg": "sum",
                                "title": "Total Latitude"
                            }
                        }
                    },
                    "toNotEqual" : (radius/1000).toString()
                };
            },

            createFieldToFilterPanel: function(fieldName) {
                return {
                    "jaql": {
                        "table": "Well",
                        "column": fieldName,
                        "dim": "[Well." + fieldName + "]",
                        "datatype": "numeric",
                        "title": fieldName,
                        "filter": {
                            "or": [],
                            "custom": true
                        }
                    }
                };
            },

            removeWellIDFilter: function(widget,event){
                var wellFieldName = "Well Unique Id",
                    filterFields = prism.activeDashboard.filters.$$items;

                var wellField =  $$get(widget,'googleMapFilters.shapes') || serviceFunctions.createDashFilter(wellFieldName,filterFields);

                if (event.type == google.maps.drawing.OverlayType.RECTANGLE) {
                    serviceFunctions.removeLatLngOrAttribute(wellField,event.overlay.bounds);
                }else {
                    serviceFunctions.removeCircleOrAttribute(wellField,event.overlay);
                }

                // if (!$$get(wellField,"jaql.filter.or") || $$get(wellField,"jaql.filter.or").length == 0){
                //remove filter	
                // 	$$set(widget,'googleMapFilters.shapes',{});
                // } else {
                $$set(widget,'googleMapFilters.shapes',wellField);
                // }
            },

            removeCircleOrAttribute: function(wellField,overlay){
                var circleItem = serviceFunctions.createCircleFilter(overlay.center.lat(), overlay.center.lng(), overlay.radius);

                wellField.jaql.filter.or = _.reject(wellField.jaql.filter.or, function(filter){
                    return  $$get(filter,"measure.formula") == circleItem.measure.formula;
                });
            },

            getLatLngFieldFilter: function(from,to,fieldName){
                return  {"attributes":[{
                    "table": "Well",
                    "column": fieldName,
                    "dim": "[Well." + fieldName + "]",
                    "datatype": "numeric",
                    "title": fieldName,
                    "collapsed": true,
                    "filter": 
                        from > to 
                        ? 
                        {
                            "and":[{
                                "fromNotEqual": -180
                            }, {
                                "toNotEqual": to
                            }
                        ]}
                        : 
                        {
                            "and":[{
                                "fromNotEqual": from
                            }, {
                                "toNotEqual": to
                            }
                        ]}
                }]}
            },
    
            removeLatLngOrAttribute: function(wellField,bounds){
                var latItem = serviceFunctions.getLatLngFieldFilter(bounds.f.f,bounds.f.b,"Latitude"),
                    lngItem = serviceFunctions.getLatLngFieldFilter( bounds.b.b,bounds.b.f,"Longitude");

                wellField.jaql.filter.or = _.reject(wellField.jaql.filter.or, function(filter){
                    return filter.and && filter.and[0] && filter.and[1]
                        && JSON.stringify(filter.and[0]) ==  JSON.stringify(latItem)
                        && JSON.stringify(filter.and[1]) ==  JSON.stringify(lngItem);
                });
            }

        }

        return serviceFunctions;

    }
]);


										

										

										

										

										

										
										

										

										

										

										

										
										

										
