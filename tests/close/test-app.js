
const m = require("main");
const timer = require("timer");

exports.testBrowser = function (test) {

 var callbacks = { quit: function() {
    test.pass();
    test.done();
  } };

  test.waitUntilDone();
  m.main( options, callbacks);

  timer.setTimeout( function () {
       var mainBrowser= m.getAppBrowser();
       var mainDoc = mainBrowser.contentDocument;
       var evt = mainDoc.createEvent("MouseEvents");
       evt.initMouseEvent("click", true, true, mainBrowser.contentWindow ,
         0, 0, 0, 0, 0, false, false, false, false, 0, null);

       mainDoc.getElementById("button").dispatchEvent(evt);
       test.assert( m.getAppWindow == null );
       test.done();

  } , 5000);

}


