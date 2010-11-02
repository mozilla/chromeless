function runScript() { 

  var sbs = securableModule = require("securable-module");
  local = { 
    debug: function (s) { 
 	alert(s);
    }
  } 
  var loaderOptions = {rootPath: null,
                       rootPaths: null,
                       fs:null, 
                       defaultPrincipal: "system",
                       globals:{ print: function (s) { local.debug(s) }  }  };

  var loader = new securableModule.Loader(loaderOptions);
  loader.runScript("a=1")
  loader.runScript("print('hello world from the HTML page JS in the sand')")
 
} 
