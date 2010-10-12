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

var obsvc = require("observer-service");
var {Cc,Ci} = require("chrome");

function runTests(iterations, filter, profileMemory, verbose, rootPaths, quit, print) {
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);

  var window = ww.openWindow(null, "data:text/plain,Running tests...",
                             "harness", "centerscreen", null);

  var harness = require("harness");

  function onDone(tests) {
    window.close();
    if (tests.passed > 0 && tests.failed == 0) {
      quit("OK");
    } else {
      if (tests.passed == 0) {
        print("No tests were run\n");
      } else {
        printFailedTests(tests, verbose, print);
      }
      quit("FAIL");
    }
  };

  harness.runTests({iterations: iterations,
                    filter: filter,
                    profileMemory: profileMemory,
                    verbose: verbose,
                    rootPaths: rootPaths,
                    print: print,
                    onDone: onDone});
}

function printFailedTests(tests, verbose, print) {
  if (!verbose)
    return;

  let iterationNumber = 0;
  let singleIteration = tests.testRuns.length == 1;
  let padding = singleIteration ? "" : "  ";

  print("\nThe following tests failed:\n");

  for each (let testRun in tests.testRuns) {
    iterationNumber++;

    if (!singleIteration)
      print("  Iteration " + iterationNumber + ":\n"); 

    for each (let test in testRun) {
      if (test.failed > 0) {
        print(padding + "  " + test.name + ": " + test.errors +"\n");
      }
    }
    print("\n");
  }
}

exports.main = function main(options, callbacks) {
  var testsStarted = false;

  function doRunTests() {
    if (!testsStarted) {
      testsStarted = true;
      runTests(options.iterations, options.filter,
               options.profileMemory, options.verbose,
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
  }
  else {
    obsvc.add(obsvc.topics.APPLICATION_READY, doRunTests);
  }
};
