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

    var passed = 0;
    var failed = 0;
    function log(message, label) {
      dump(label + ": " + message + "\n");
      switch (label) {
      case "pass":
        passed++;
        break;
      case "fail":
        failed++;
        break;
      case "info":
        break;
      default:
        throw new Exception("Unexpected label: " + label);
      }
    }

    try {
      Components.utils.import("resource://jetpack/modules/booster.js",
                              SecurableModule);
      Components.utils.import("resource://jetpack/modules/booster-tests.js",
                              Tests);
      Tests.run(SecurableModule, log);
      dump("tests passed: " + passed + "\n");
      dump("tests failed: " + failed + "\n");
      if (passed >= 0 && failed == 0)
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
