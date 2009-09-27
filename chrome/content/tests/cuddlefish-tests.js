function testCuddlefish(test) {
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
                   "console.log() must work.");

  loader.runScript("console.info('testing', 1, [2, 3, 4])");
  test.assertEqual(prints[1], "info: testing 1 2,3,4\n",
                   "console.info() must work.");

  loader.runScript("console.warn('testing', 1, [2, 3, 4])");
  test.assertEqual(prints[2], "warning: testing 1 2,3,4\n",
                   "console.warn() must work.");

  loader.runScript("console.error('testing', 1, [2, 3, 4])");
  test.assertEqual(prints[3], "error: testing 1 2,3,4\n",
                   "console.error() must work.");

  loader.runScript("console.debug('testing', 1, [2, 3, 4])");
  test.assertEqual(prints[4], "debug: testing 1 2,3,4\n",
                   "console.debug() must work.");
}

var run = exports.run = function run(onDone) {
  var unitTest = require("unit-test");
  var tests = [require("test-console").testConsole,
               testCuddlefish];
  var runner = new unitTest.TestRunner();

  function runNextTest() {
    var test = tests.pop();
    if (test) {
      runner.start({test: test, onDone: runNextTest});
    } else
      onDone(runner);
  }

  runNextTest();
};
