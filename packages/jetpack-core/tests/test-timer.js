var timer = require("timer");

exports.testSetTimeout = function(test) {
  timer.setTimeout(function() {
    test.pass("testSetTimeout passed");
    test.done();
  }, 1);
  test.waitUntilDone();
};

exports.testClearTimeout = function(test) {
  var myFunc = function myFunc() {
    test.fail("myFunc() should not be called in testClearTimeout");
  };
  var id = timer.setTimeout(myFunc, 1);
  timer.setTimeout(function() {
    test.pass("testClearTimeout passed");
    test.done();
  }, 2);
  timer.clearTimeout(id);
  test.waitUntilDone();
};

exports.testSetInterval = function (test) {
  var count = 0;
  var id = timer.setInterval(function () {
    count++;
    if (count >= 5) {
      timer.clearInterval(id);
      test.pass("testSetInterval passed");
      test.done();
    }
  }, 1);
  test.waitUntilDone();
};

exports.testClearInterval = function (test) {
  timer.clearInterval(timer.setInterval(function () {
    test.fail("setInterval callback should not be called");
  }, 1));
  var id = timer.setInterval(function () {
    timer.clearInterval(id);
    test.pass("testClearInterval passed");
    test.done();
  }, 2);
  test.waitUntilDone();
};

exports.testUnload = function(test) {
  var loader = new test.makeSandboxedLoader();
  var sbtimer = loader.require("timer");

  var myFunc = function myFunc() {
    test.fail("myFunc() should not be called in testUnload");
  };

  sbtimer.setTimeout(myFunc, 1);
  sbtimer.setInterval(myFunc, 1);
  loader.unload();
  timer.setTimeout(function() {
    test.pass("timer testUnload passed");
    test.done();
  }, 2);
  test.waitUntilDone();
};
