var timer = require("timer");

exports.testSetTimeout = function(test) {
  timer.setTimeout(function() { test.done(); }, 1);
  test.waitUntilDone();
};

exports.testClearTimeout = function(test) {
  var myFunc = function myFunc() {
    test.fail("myFunc() should not be called in testClearTimeout");
  };
  var id = timer.setTimeout(myFunc, 1);
  timer.setTimeout(function() { test.done(); }, 2);
  timer.clearTimeout(id);
  test.waitUntilDone();
};

exports.testUnload = function(test) {
  var loader = new test.makeSandboxedLoader();
  var sbtimer = loader.require("timer");

  var myFunc = function myFunc() {
    test.fail("myFunc() should not be called in testUnload");
  };

  sbtimer.setTimeout(myFunc, 1);
  loader.unload();
  timer.setTimeout(function() { test.done(); }, 2);
  test.waitUntilDone();
};
