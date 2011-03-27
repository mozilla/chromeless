const m = require("main");
const timer = require("timer");

exports.testBrowser = function (test) {
 var callbacks = {
  onload: function () { 
       var mainBrowser= m.getAppBrowser();
       var mainDoc = mainBrowser.contentDocument;
       var appWindow = m.getAppWindow;
       mainBrowser.contentWindow.addEventListener("load", function pageLoaded() { 
         test.assert( mainDoc.location != mainDoc.getElementById("inner").contentDocument.location);
         test.done();
       },false);
  }, 
  quit: function() {
    test.pass();
    test.done();
  } 
 };
  test.waitUntilDone();
  m.main( options, callbacks);
}
