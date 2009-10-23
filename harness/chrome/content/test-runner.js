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

var cService = Cc['@mozilla.org/consoleservice;1'].getService()
               .QueryInterface(Ci.nsIConsoleService);

// Cuddlefish loader for the sandbox in which we load and
// execute tests.
var sandbox;

// Function to call when we're done running tests.
var onDone;

// Function to print text to a console, w/o CR at the end.
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
