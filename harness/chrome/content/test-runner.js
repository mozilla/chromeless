var cService = Cc['@mozilla.org/consoleservice;1'].getService()
               .QueryInterface(Ci.nsIConsoleService);

var sandbox;
var onDone;
var print;

function testsDone(tests) {
  try {
    sandbox.require("unload").send();
  } catch (e) {
    tests.fail("unload.send() threw an exception: " + e);
  };

  print("\n");
  var total = tests.passed + tests.failed;
  print(tests.passed + " of " + total + " tests passed.\n");
  onDone(tests);
}

var POINTLESS_ERRORS = [
  "Invalid chrome URI:"
];

var consoleListener = {
  observe: function(object) {
    var message = object.QueryInterface(Ci.nsIConsoleMessage).message;
    var pointless = [err for each (err in POINTLESS_ERRORS)
                         if (message.indexOf(err) == 0)];
    if (pointless.length == 0)
      print("console: " + message);
  }
};

function TestRunnerConsole(base, options) {
  this.__proto__ = {
    info: function info(first) {
      if (options.verbose)
        base.info.apply(base, arguments);
      else
        if (first == "pass:")
          print(".");
    },
    __proto__: base
  };
}

var runTests = exports.runTests = function runTests(options) {
  onDone = options.onDone;
  print = options.print;
  try {
    cService.registerListener(consoleListener);

    var cuddlefish = require("cuddlefish");
    var ptc = require("plain-text-console");
    var url = require("url");

    var dirs = [url.toFilename(path)
                for each (path in options.rootPaths)];
    var console = new TestRunnerConsole(new ptc.PlainTextConsole(print),
                                        options);

    sandbox = new cuddlefish.Loader({console: console,
                                     __proto__: options});
    sandbox.require("unit-test").findAndRunTests({dirs: dirs,
                                                  onDone: testsDone});
  } catch (e) {
    print(require("traceback").format(e) + "\n" + e + "\n");
    onDone({passed: 0, failed: 1});
  }
};

require("unload").when(
  function() {
    if (consoleListener)
      cService.unregisterListener(consoleListener);
  });
