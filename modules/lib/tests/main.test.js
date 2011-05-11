var options = { "staticArgs": {quitWhenDone: true, "browser":"./tests/require_hidden-iframe/index.html", "appBasePath":"/Users/marciogalli/Desktop/chromeless/mozilla/repository/v2/Mar01-test-branch/chromeless" } }; 

const m = require("main");
const timer = require("timer");
const self = require("self");

/*
exports.testBrowser = function (test) { 

 var callbacks = { quit: function() {
    test.pass();
    test.done();
  } };

  test.waitUntilDone();
  m.main( options, callbacks);

  console.log("Checking against App = appWindow._browser:" + m.getAppWindow());
  timer.setTimeout( function () { 
  	var mainAppTitle = m.getAppBrowser().contentDocument.title;
  	console.log("After timer, checking main app Title: " + mainAppTitle);
 	test.assert( mainAppTitle.length>0 );
	test.done();
  } , 5000); 

} 

*/
