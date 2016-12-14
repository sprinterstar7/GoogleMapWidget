mod.service('heatmapService', [

    function() {
        
        var self = this;

        //Define your private variables
        var _heatMap, _heatMapData = [], 
            google, map, e;

        //Define an object of functions to return
        var serviceFunctions =  { 

            //Let's try to keep a convention of running any startup script, variable population, etc... 
            //in an init function.  
            init: function(inWidgetMap, inGoogle, inE) { 
                map = inWidgetMap,
                google = inGoogle; 
                e = inE;

                if (!e.widget.queryMetadata.heatmapSettings) {
                    e.widget.queryMetadata.heatmapSettings = {
                        "radius": 15,
                        "maxIntensity": 0,
                        "toggled" : false
                    };
                    e.widget.changesMade();
                }
                
                _heatMap = new google.maps.visualization.HeatmapLayer({
                    dissipating: true,
                    opacity: 1,
                    radius: e.widget.queryMetadata.heatmapSettings.radius,
                    maxIntensity: e.widget.queryMetadata.heatmapSettings.maxIntensity,
                    gradient: [
                        'rgba(84, 84, 90, 0)',
                        'rgba(84, 84, 90, 1)',
                        'rgba(0, 0, 255, 1)',
                        'rgba(0, 255, 0, 1)',
                        'rgba(255, 255, 0, 1)',
                        'rgba(255, 74, 0, 1)',
                        'rgba(255, 0, 0, 1)'
                    ],
                    map:  e.widget.queryMetadata.heatmapSettings.toggled ? map : null
                });

                
            },

            clear: function() {
                _heatMapData = [];
                _heatMap.setData(_heatMapData);
            },

            push: function(point) {
                _heatMapData.push(point);
            },

            apply: function(maxValue) {
                _heatMap.setData(_heatMapData);
                var i,r;
                if ($("#intensityInput").val() && e.widget.queryMetadata.heatmapSettings.maxIntensity == 0) {
                    e.widget.queryMetadata.heatmapSettings.maxIntensity = Math.round(maxValue);
                    
                    e.widget.changesMade();
                }
                
                _heatMap.set("maxIntensity", e.widget.queryMetadata.heatmapSettings.maxIntensity == 0 ? null : e.widget.queryMetadata.heatmapSettings.maxIntensity);
                _heatMap.set('radius', e.widget.queryMetadata.heatmapSettings.radius );
            },

            setRadius: function () {
                var val = $("#radiusInput").val();
                
                _heatMap.set('radius', val);
                e.widget.queryMetadata.heatmapSettings.radius = val;

                e.widget.changesMade();
            },

            setIntensity: function () {
                var val = $("#intensityInput").val() == 0 ? null : $("#intensityInput").val();
                
                _heatMap.set("maxIntensity", val);
                e.widget.queryMetadata.heatmapSettings.maxIntensity = val;

                e.widget.changesMade();
            },
            
            getRadius: function () {
                return _heatMap.get('radius');
            },

            getIntensity: function () {
                return _heatMap.get("maxIntensity");
            },

            getHeatmap: function() { 
                return _heatMap;
            },

            isToggled: function() { 
                return _heatMap.map ? true : false;
            }
        }

        return serviceFunctions;

    }
]);