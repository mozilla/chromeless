var url = require("url");
var traceback = require("traceback");
var file = require("file");

function getMyUrl() {
  return traceback.get().slice(-1)[0].filename;
}

function makeSandboxedLoader(options) {
  if (!options)
    options = {};
  var Cuddlefish = require("cuddlefish");

  var myUrl = getMyUrl();
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

  var myDir = file.dirname(url.toFilename(getMyUrl()));

  var suites = [name.slice(0, -3)
                for each (name in file.list(myDir))
                if (/^test-.*\.js$/.test(name))];

  suites.forEach(
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
