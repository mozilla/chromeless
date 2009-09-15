/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function quit() {
  var appStartup = Cc['@mozilla.org/toolkit/app-startup;1'].
                   getService(Ci.nsIAppStartup);

  appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
}

window.addEventListener(
  "load",
  function() {
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
      var dirSvc = Cc["@mozilla.org/file/directory_service;1"]
                   .getService(Ci.nsIDirectoryServiceProvider);
      var rootDir = dirSvc.getFile("CurWorkD", {});
      rootDir.append("interoperablejs-read-only");
      rootDir.append("compliance");
      if (!rootDir.exists())
        throw new Error("Compliance test directory doesn't exist at " +
                        rootDir.path);

      // Ensure the module works when loaded as a JS module.
      log("running tests in JS module", "info");
      var jsmSecurableModule = {};
      var jsmTests = {};
      Cu.import("resource://jetpack/modules/booster.js", jsmSecurableModule);
      Cu.import("resource://jetpack/modules/booster-tests.js", jsmTests);
      jsmTests.run(jsmSecurableModule, log, rootDir);

      // Ensure the module works when imported into a window via a
      // script src tag.
      log("running tests in window", "info");
      SecurableModuleTests.run(SecurableModule, log, rootDir);

      dump("tests passed: " + passed + "\n");
      dump("tests failed: " + failed + "\n");
      if (passed >= 0 && failed == 0)
        dump("OK\n");
      else
        dump("FAIL\n");
    } catch (e) {
      dump("Exception: " + e + " (" + e.fileName +
           ":" + e.lineNumber + ")\n");
      if (e.stack)
        dump("Stack:\n" + e.stack);
      dump("FAIL\n");
    }
    quit();
  },
  false
);
