var SUITES = ["test-cuddlefish",
              "test-url",
              "test-timer",
              "test-console"];

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
  runner.startMany({tests: tests, onDone: onDone});
};
