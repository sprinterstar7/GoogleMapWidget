mod.service('exampleService', [

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

            exampleFunction: function() { 
                return 1;
            },

            //Any function that relies on another function in the variable must be called with the serviceFunctions prefix. 
            selfReferencingFunction: function() { 
                return serviceFunctions.exampleFunction() + 1;
            }
        
        }

        return serviceFunctions;

    }
]);