const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";

var obsvc = require("observer-service");

var gOptions;

function runTests() {
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);
  var window = ww.openWindow(null, "data:text/plain,Running tests...",
                             "harness", "centerscreen", null);

  var harness = require("harness");

  gOptions.print = function() { dump.apply(undefined, arguments); };

  var quit = gOptions.quit;

  gOptions.onDone = function onDone(tests) {
    if (tests.passed > 0 && tests.failed == 0)
      quit("OK");
    else
      quit("FAIL");
  };

  harness.runTests(gOptions);
  gOptions = null;
}

exports.main = function main(options) {
  gOptions = options;

  var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULAppInfo);
  let obSvc = Cc["@mozilla.org/observer-service;1"]
              .getService(Ci.nsIObserverService);

  switch (appInfo.ID) {
  case THUNDERBIRD_ID:
    obsvc.add("xul-window-visible", runTests);
    break;
  case FIREFOX_ID:
    obsvc.add("sessionstore-windows-restored", runTests);
    break;
  default:
    obsvc.add("final-ui-startup", runTests);
    break;
  }
};
