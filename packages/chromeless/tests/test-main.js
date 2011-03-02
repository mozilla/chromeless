// here is how we talk with main

const m = require("main");
const timer = require("timer");
const self = require("self");

exports.testReplace = function(test) {
  const input = "Hello World";
  const output = m.testFunction(input);
  test.assertEqual(output, "Hello Hello");
  var callbacks = { quit: function() {} };
};

exports.testID = function(test) {
  test.assert(self.id.length > 0);
};

exports.testBrowser = function (test) { 

   var options = { "staticArgs": {quitWhenDone: true, "browser":"./examples/dragdrop/index.html", "appBasePath":"/Users/marciogalli/Desktop/chromeless/mozilla/repository/v2/Mar01-test-branch/chromeless" } }; 

 var callbacks = { quit: function() {
    test.pass();
    test.done();
  } };

  test.waitUntilDone();
  m.main( options, callbacks);
  console.log("Checking against App = appWindow._browser:" + m.getAppWindow());
  timer.setTimeout( function () { 
  	var mainAppTitle = m.getAppWindow()._browser.contentDocument.title;
  	console.log("After timer, checking main app Title: " + mainAppTitle);
 	test.assert( mainAppTitle.length>0 );
	test.done();
  } , 5000); 

} 


