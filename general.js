var maps;

prism.run([function(){
    prism.on("dashboardloaded",function(e,args){
        maps = [];
        args.dashboard.on("filterschanged",function(e,args){
            $('#mapRefresh').hide();
        });
    });
}]);

function getWidgetMap(widgetOid){
    if (maps){
        return maps[widgetOid];
    }
}

function setWidgetMap(widgetOid,map){
    if (!maps){
        maps = {
            [widgetOid]: map
        };
    } else {
        maps[widgetOid] = map;
    }
}

mod.directive('updateBall', [
    function ($url, $timeout, $device) {
        return {
            restrict: 'C',
            link: function (scope, element, attrs) {
                $(".update-ball").click(function(scope, element, attrs){
                    if ( $("#mapRefresh")[0] && $("#mapRefresh")[0].style.display !== 'none' ) {
                         scope.stopImmediatePropagation();
                    
                        $("#mapRefresh").trigger("click");
                    }
                });
            }
        }
    }
]);