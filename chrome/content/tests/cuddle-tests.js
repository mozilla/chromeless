function runTests(log, assert) {
  var Cuddlefish = require("cuddle");
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
  log("loader instantiates within a securablemodule", "pass");

  loader.runScript("console.log('testing', 1, [2, 3, 4])");
  assert.isEqual(prints[0], "info: testing 1 2,3,4\n",
                 "console.log() must work.");

  loader.runScript("console.info('testing', 1, [2, 3, 4])");
  assert.isEqual(prints[1], "info: testing 1 2,3,4\n",
                 "console.info() must work.");

  loader.runScript("console.warn('testing', 1, [2, 3, 4])");
  assert.isEqual(prints[2], "warning: testing 1 2,3,4\n",
                 "console.warn() must work.");

  loader.runScript("console.error('testing', 1, [2, 3, 4])");
  assert.isEqual(prints[3], "error: testing 1 2,3,4\n",
                 "console.error() must work.");

  loader.runScript("console.debug('testing', 1, [2, 3, 4])");
  assert.isEqual(prints[4], "debug: testing 1 2,3,4\n",
                 "console.debug() must work.");
}

var run = exports.run = function run() {
  require("dump-test-runner").run(runTests);
};
