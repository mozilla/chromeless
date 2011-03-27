const m = require("main");
const timer = require("timer");

exports.testBrowser = function (test) {
 var callbacks = {
  onload: function () { 
       var mainBrowser= m.getAppBrowser();
       mainBrowser.contentWindow.addEventListener("load", function pageLoaded() { 
         test.assert( mainBrowser.contentDocument.body.innerHTML == "new content" );
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
