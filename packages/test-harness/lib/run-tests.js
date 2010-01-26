const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";

var obsvc = require("observer-service");

function runTests(iterations, verbose, rootPaths, quit) {
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);

  // TODO: Close this window on unload.
  var window = ww.openWindow(null, "data:text/plain,Running tests...",
                             "harness", "centerscreen", null);

  var harness = require("harness");

  function print() {
    dump.apply(undefined, arguments);
  };

  function onDone(tests) {
    if (tests.passed > 0 && tests.failed == 0)
      quit("OK");
    else
      quit("FAIL");
  };

  harness.runTests({iterations: iterations,
                    verbose: verbose,
                    rootPaths: rootPaths,
                    print: print,
                    onDone: onDone});
}

exports.main = function main(options, callbacks) {
  function doRunTests() {
    runTests(options.iterations, options.verbose,
             options.rootPaths, callbacks.quit);
  }

  // TODO: This is optional code that might be put in by
  // something running this code to force it to just
  // run tests immediately, rather than wait. We need
  // to actually standardize on this, though.
  if (options.runImmediately) {
    doRunTests();
    return;
  }

  var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULAppInfo);
  let obSvc = Cc["@mozilla.org/observer-service;1"]
              .getService(Ci.nsIObserverService);

  switch (appInfo.ID) {
  case THUNDERBIRD_ID:
    obsvc.add("xul-window-visible", doRunTests);
    break;
  case FIREFOX_ID:
    obsvc.add("sessionstore-windows-restored", doRunTests);
    break;
  default:
    obsvc.add("final-ui-startup", doRunTests);
    break;
  }
};
