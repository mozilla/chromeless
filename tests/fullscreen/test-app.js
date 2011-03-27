
const m = require("main");
const timer = require("timer");

exports.testBrowser = function (test) {

 var callbacks = {
  
  onload: function () { 
       var mainBrowser= m.getAppBrowser();
       var mainWin = mainBrowser.contentWindow;

       var originalWidth = mainWin.innerWidth;
       mainWin.addEventListener("load", function pageLoaded() { 
    	timer.setTimeout(function delayedTest() { 
         var currentWidth = mainWin.innerWidth;
         test.assert( originalWidth != currentWidth);
         test.done();
        },500); 
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

function delayedTest() { 
} 
