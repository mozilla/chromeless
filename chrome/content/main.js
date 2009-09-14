const Cc = Components.classes;
const Ci = Components.interfaces;

function quit() {
  var appStartup = Cc['@mozilla.org/toolkit/app-startup;1'].
                   getService(Ci.nsIAppStartup);

  appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
}

window.addEventListener(
  "load",
  function() {
    var SecurableModule = {};
    var Tests = {};
    try {
      Components.utils.import("resource://jetpack/modules/booster.js",
                              SecurableModule);
      Components.utils.import("resource://jetpack/modules/booster-tests.js",
                              Tests);
      var result = Tests.run(SecurableModule,
                             function log(msg) { dump(msg + "\n"); });
      dump("tests passed: " + result.passed + "\n");
      dump("tests failed: " + result.failed + "\n");
      if (result.success)
        dump("OK\n");
      else
        dump("FAIL\n");
    } catch (e) {
      dump("Exception: " + e + " (" + e.fileName +
           ":" + e.lineNumber + ")\n");
      dump("FAIL\n");
    }
    quit();
  },
  false
);
