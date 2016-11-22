mod.service('kmlService', [

    function() {
        
        var self = this;

        var _kmlControlsShowing = false,
            _presentKMLLayers = [],
            _layersClickedOnce = [],
            _layerRetries = 0,
            widgetMap,
            google,
            map

        //Update all major basin layer ids except Eagleford
        var kmlLayers = [
            { id: 5, title: 'Proppant Mine Locations' },
            { id: 4, title: 'Transload Terminal Locations' },
            { id: 0, title: 'US Rail Network' },  
            { id: 7, title: 'Barnett Basin' },    
            { id: 15, title: 'DS Basin' },
            { id: 9, title: 'Eaglebine Basin' },
            { id: 6, title: 'Eagleford Basin' },
            { id: 10, title: 'Fayetteville Basin' },
            { id: 11, title: 'Haynesville Basin' },
            { id: 12, title: 'Marcellus Basin' },
            { id: 13, title: 'Permian Basin' },
            { id: 14, title: 'PRB Basin' },
            { id: 15, title: 'San Jan Basin' },
            { id: 16, title: 'TMS Play Basin' },
            { id: 17, title: 'Utica Basin' },      
            { id: 18, title: 'Woodford Basin' }          
        ];

        var serviceFunctions =  { 

            init: function(inWidgetMap, inGoogle) { 
                map = widgetMap = inWidgetMap,
                google = inGoogle;

                var controlDiv = document.createElement('div');
                serviceFunctions.CenterControl(controlDiv, widgetMap);
                controlDiv.index = 1;
                widgetMap.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);
            },

            CenterControl: function(controlDiv, map) { 
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
                        serviceFunctions.setKMLLayer(layer.id);
                    });

                    a.innerHTML = layer.title;

                    li.appendChild(a);
                    ul.appendChild(li);
                });

                control.appendChild(ul);
            },

            setKMLLayer: function(kmlId) {
                //All US Rail Networks
                if (kmlId === 0) {
                    //First time click
                    if (!serviceFunctions.usRailsAdded() && !serviceFunctions.hasBeenClicked(kmlId)) {
                        $('#KMLLayerCheckBox'+kmlId).css("color", "rgb(247, 149, 72)");
                        for (var i = 0; i < 4; i++) {
                            serviceFunctions.loadLayer(i);
                        }
                    }
                }
                else if (kmlId === 6) {
                    //First time click
                    if (!serviceFunctions.usRailsAdded() && !serviceFunctions.hasBeenClicked(kmlId)) {
                        $('#KMLLayerCheckBox' + kmlId).css("color", "rgb(247, 149, 72)");
                        for (var i = 6; i < 15; i++) {
                            serviceFunctions.loadLayer(i);
                        }
                        _layersClickedOnce.push(6)
                    }
                    //Toggle attributes if not first click
                    else {
                        $('#KMLLayerCheckBox' + kmlId).css("color", (serviceFunctions.layerIsSelected(kmlId) ? "rgb(188, 189, 192)" : "rgb(247, 149, 72)"));
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
                    if (!serviceFunctions.layerAdded(kmlId) && !serviceFunctions.hasBeenClicked(kmlId))
                    {
                        $('#KMLLayerCheckBox' + kmlId).css("color", "rgb(247, 149, 72)");
                        serviceFunctions.loadLayer(kmlId);
                        _layersClickedOnce.push(kmlId);
                    }
                    //Toggle attributes if not first click
                    else {
                        //Grab the layer, only reverse attributes if layer exists; if not, just toggle the selection in dropdown
                        var loc = _.find(_presentKMLLayers, function (layer) { return layer.kmlId === kmlId });
                        if (loc) {
                            serviceFunctions.toggleAttributes(loc, kmlId);
                        }
                        else {
                            serviceFunctions.toggleSelected(kmlId);
                        }
                    }

                }
            },

            //Check if the layer has been loaded successfully
            layerAdded: function(kmlId) {
                return _.find(_presentKMLLayers, function (layer) { return layer.kmlId === kmlId }) ? true : false;
            },

            //Check if the layer is selected in the dropdown
            layerIsSelected: function(kmlId) {
                //If a US rail, check if 0 is selected
                if(kmlId > 5 && kmlId < 15){
                    kmlId = 6;
                }
                else if (kmlId < 4){
                    kmlId = 0;
                }
                return $('#KMLLayerCheckBox'+kmlId).css("color") === "rgb(247, 149, 72)";
            },

            //Check that at least one layer exists, showing this has been called before
            usRailsAdded: function() {
                return _.find(_presentKMLLayers, function (layer) {
                    return layer.kmlId === 0 || layer.kmlId === 1 || layer.kmlId === 2 || layer.kmlId === 3
                }) ? true : false;
            },

            //Check if the layer has been selected at least one time
            hasBeenClicked: function(kmlId) {
                return _layersClickedOnce.indexOf(kmlId) > -1;
            },

            //Reverse the current attributes of the layer
            toggleAttributes: function(loc, kmlId) {
                $('#KMLLayerCheckBox' + kmlId).css("color", (serviceFunctions.layerIsSelected(kmlId) ? "rgb(188, 189, 192)" : "rgb(247, 149, 72)"));
                loc.checked = !loc.checked;
                loc.checked ? loc.kmlLayer.setMap(map) : loc.kmlLayer.setMap(null);
            },

            //Reverse the visibility of the check mark on the dropdown, either 'selecting' or 'unselecting' it.
            toggleSelected: function(kmlId) {
                $('#KMLLayerCheckBox' + kmlId).css("color", (serviceFunctions.layerIsSelected(kmlId) ? "rgb(188, 189, 192)" : "rgb(247, 149, 72)"));
            },

            clearKmlLayers: function() {
                $('[id^="KMLLayerCheckBox"]').each(function (item) {
                    $(this).css("visibility", "hidden");
                });
                _.each(_presentKMLLayers, function (layer) {
                    layer.kmlLayer.setMap(null);
                    layer.checked = false;
                });
            },

            loadLayer: function(id) {
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
                                        if (!serviceFunctions.layerIsSelected(id)) {
                                            item.kmlLayer.setMap(null);
                                            item.checked = false;
                                        }
                                        _presentKMLLayers.push(item);
                                    }
                                    else {
                                        if (_layerRetries < 10) {
                                            console.warn('KML layer not added [' + id + ']. Trying again.');
                                            serviceFunctions.loadLayer(id);
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

        }

        return serviceFunctions;

    }
]);
										

										

										

										

										
										

										

										

										