mod.service('mapStyleService', [

    function() {
        
        var self = this;

        //Define your private variables
        var privateVariables;

        //Define an object of functions to return
        var serviceFunctions =  { 

            //Let's try to keep a convention of running any startup script, variable population, etc... 
            //in an init function.  
            init: function(inParameters) { 
                privateVariables = inParameters;
            },

            getDarkTheme: function() { 
                var darkThemeType = new google.maps.StyledMapType(
                    [
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
                    ],
                    {name: 'Dark'}
                );

                return darkThemeType;
            
            },

            //Any function that relies on another function in the variable must be called with the serviceFunctions prefix. 
            getLightTheme: function() { 
                var lightThemeType = new google.maps.StyledMapType(
                    [
                        {
                            "featureType": "landscape",
                            "stylers": [
                            { "color": "#FEFEFE" },
                            { "hue": "#00ff88" },
                            { "visibility": "simplified" }
                            ]
                        }, {
                            "featureType": "water",
                            "stylers": [
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
                            { "visibility": "simplified" },
                            { "lightness": -20 }
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
                            "elementType": "labels.text.fill",
                            "stylers": [
                            { "color": "#000000" }
                            ]
                        }, {
                            "featureType": "administrative",
                            "elementType": "geometry.fill",
                            "stylers": [
                            { "color": "#FEFEFE" }
                            ]
                        }
                    ],
                    { name: 'Light' }
                );

                return lightThemeType;
            }
        
        }

        return serviceFunctions;

    }
]);