
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
       console.log("111" + m.getAppWindow.console);
       var mainDoc = mainBrowser.contentDocument;

       test.assert( m.getAppWindow.console.log != null );
       test.done();

  } , 5000);

}


