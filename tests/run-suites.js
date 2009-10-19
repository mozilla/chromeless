var url = require("url");
var file = require("file");

function makeSandboxedLoader(options) {
  if (!options)
    options = {};
  var Cuddlefish = require("cuddlefish");

  options.rootPaths = [__url__, url.resolve(__url__, "../lib/")];
  return new Cuddlefish.Loader(options);
}

function makeTest(suite, name, test, verbose) {
  function runTest(runner) {
    if (verbose)
      console.info("executing '" + suite + "." + name + "'");
    test(runner);
  }
  return runTest;
}

var run = exports.run = function run(options) {
  var testConsole = {
    info: function info(first) {
      if (first == "pass:") {
        if (options.verbose)
          console.info.apply(console, arguments);
        else if (options.onPass) {
          options.onPass();
        }
      } else
        console.info.apply(console, arguments);
    },
    __proto__: console
  };

  var unitTest = require("unit-test");

  var tests = [];

  var myDir = file.dirname(url.toFilename(__url__));

  var suites = [name.slice(0, -3)
                for each (name in file.list(myDir))
                if (/^test-.*\.js$/.test(name))];

  suites.forEach(
    function(suite) {
      var module = require(suite);
      for (name in module)
        if (name.indexOf("test") == 0)
          tests.push(makeTest(suite, name, module[name],
                              options.verbose));
    });

  var runner = new unitTest.TestRunner();
  runner.makeSandboxedLoader = makeSandboxedLoader;
  runner.startMany({tests: tests,
                    onDone: options.onDone,
                    console: testConsole});
};
