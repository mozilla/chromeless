const m = require("main");
const timer = require("timer");

exports.testBrowser = function (test) {
 var callbacks = {
  onload: function () { 
       var mainBrowser= m.getAppBrowser();
       timer.setTimeout(function () { 
         test.assert( mainBrowser.contentDocument.getElementById("load-start").innerHTML == "ok" );
         test.assert( mainBrowser.contentDocument.getElementById("load-stop").innerHTML == "ok" );
         test.assert( mainBrowser.contentDocument.getElementById("progress").innerHTML != "..." );
         test.assert( mainBrowser.contentDocument.getElementById("security").innerHTML != "..." );
         test.assert( mainBrowser.contentDocument.getElementById("title").innerHTML != "..." );
         test.assert( mainBrowser.contentDocument.getElementById("status").innerHTML != "..." );
         test.done();
       },5000); 
  }, 
  quit: function() {
    test.pass();
    test.done();
  } 
 };
  test.waitUntilDone();
  m.main( options, callbacks);
}
