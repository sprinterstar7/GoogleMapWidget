var maps;

prism.run([function(){
    prism.on("dashboardloaded",function(e,args){
        maps = [];
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

