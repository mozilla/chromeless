exports.testLoader = function(test) {
  var Cuddlefish = require("cuddlefish");
  var url = require("url");
  var traceback = require("traceback");

  var prints = [];
  function print(message) {
    prints.push(message);
  }

  var myUrl = traceback.get().slice(-1)[0].filename;
  var rootPaths = [myUrl, url.resolve(myUrl, "../lib/")];
  var loader = new Cuddlefish.Loader({rootPaths: rootPaths,
                                      print: print});
  test.pass("loader instantiates within a securablemodule");

  loader.runScript("console.log('testing', 1, [2, 3, 4])");

  test.assertEqual(prints[0], "info: testing 1 2,3,4\n",
                   "global console must work.");
};

var run = exports.run = function run(onDone) {
  var unitTest = require("unit-test");
  var tests = [require("test-console").testConsole,
               exports.testLoader];
  var runner = new unitTest.TestRunner();

  runner.startMany({tests: tests, onDone: onDone});
};
