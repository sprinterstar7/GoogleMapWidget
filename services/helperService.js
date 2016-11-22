mod.service('helperService', [

    function() {
        
        var self = this;

        //Define your private variables

        //Define an object of functions to return
        var serviceFunctions =  { 

            //Let's try to keep a convention of running any startup script, variable population, etc... 
            //in an init function.  
            init: function() { 
            },

            //	Define function to format numbers w/ commas
            formatWithCommas: function (x) {
                var parts = x.toString().split(".");
                return parts[0].replace(/\B(?=(\d{3})+(?=$))/g, ",") + (parts[1] ? "." + parts[1] : "");
            }
        
        }

        return serviceFunctions;

    }
]);