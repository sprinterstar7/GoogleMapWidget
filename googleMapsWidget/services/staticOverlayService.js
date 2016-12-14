mod.service('staticOverlayService', [

    function() {
        
        var self = this;

        //Define your private variables
        var widgetMap, google, map, overlay;

        //Define an object of functions to return
        var serviceFunctions =  { 

            //Let's try to keep a convention of running any startup script, variable population, etc... 
            //in an init function.  
            init: function(inWidgetMap, inGoogle) { 
                map = widgetMap = inWidgetMap;
                google = inGoogle;

                overlay = $('<div id="mapOverlay"></div>');
                $(map.getDiv()).append(overlay);
                $('#mapOverlay').height($(map.getDiv()).height());
                $('#mapOverlay').width($(map.getDiv()).width());
            },

            addOverlay: function() { 
                $('#mapOverlay').show();
            },

            removeOverlay: function() { 
                $('#mapOverlay').hide();
            },

            addClickToOverlay: function() { 
                $('#mapOverlay').css('pointer-events', 'none');
            },

            removeClickFromOverlay: function() { 
                $('#mapOverlay').css('pointer-events', '');
            },

            readjustOverlay: function() { 
                google.maps.event.trigger(map, 'resize');	
                $('#mapOverlay').height($(map.getDiv()).height());
                $('#mapOverlay').width($(map.getDiv()).width());
                //$('.gmnoprint').attr("data-html2canvas-ignore", "true");
            }
        
        }

        return serviceFunctions;

    }
]);