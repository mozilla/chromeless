
const m = require("main");
const timer = require("timer");

exports.testBrowser = function (test) {

 var callbacks = {
  
  onload: function () { 
       var mainBrowser= m.getAppBrowser();
       var mainDoc = mainBrowser.contentDocument;
       mainBrowser.contentWindow.addEventListener("load", function pageLoaded() { 
         test.assert( mainDoc.getElementById("inner").contentDocument.getElementById("posterousbar_nojs") == null);
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
