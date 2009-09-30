var SUITES = ["test-cuddlefish",
              "test-url",
              "test-timer",
              "test-traceback",
              "test-memory",
              "test-observer-service",
              "test-plain-text-console"];

function makeSandboxedLoader(options) {
  var Cuddlefish = require("cuddlefish");
  var url = require("url");
  var traceback = require("traceback");

  var myUrl = traceback.get().slice(-1)[0].filename;
  options.rootPaths = [myUrl, url.resolve(myUrl, "../lib/")];
  return new Cuddlefish.Loader(options);
}

function makeTest(suite, name, test) {
  function runTest(runner) {
    console.info("executing '" + suite + "." + name + "'");
    test(runner);
  }
  return runTest;
}

var run = exports.run = function run(onDone) {
  var unitTest = require("unit-test");

  var tests = [];

  SUITES.forEach(
    function(suite) {
      var module = require(suite);
      for (name in module)
        if (name.indexOf("test") == 0)
          tests.push(makeTest(suite, name, module[name]));
    });

  var runner = new unitTest.TestRunner();
  runner.makeSandboxedLoader = makeSandboxedLoader;
  runner.startMany({tests: tests, onDone: onDone});
};
