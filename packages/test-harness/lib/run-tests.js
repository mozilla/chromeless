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

const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
const FENNEC_ID = "{a23983c0-fd0e-11dc-95ff-0800200c9a66}";

var obsvc = require("observer-service");

function runTests(iterations, verbose, rootPaths, quit, print) {
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);

  var window = ww.openWindow(null, "data:text/plain,Running tests...",
                             "harness", "centerscreen", null);

  var harness = require("harness");

  function onDone(tests) {
    window.close();
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
  var testsStarted = false;

  function doRunTests() {
    if (!testsStarted) {
      testsStarted = true;
      runTests(options.iterations, options.verbose,
               options.rootPaths, callbacks.quit,
               callbacks.print);
    }
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
  case FENNEC_ID:
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
