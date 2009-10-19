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

var loader;

function quit() {
  var appStartup = Cc['@mozilla.org/toolkit/app-startup;1'].
                   getService(Ci.nsIAppStartup);

  appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
}

function onDone(tests) {
  try {
    loader.require("unload").send();
  } catch (e) {
    tests.fail("unload.send() threw an exception: " + e);
  };

  dump("\n");
  dump("tests passed: " + tests.passed + "\n");
  dump("tests failed: " + tests.failed + "\n");
  if (tests.passed >= 0 && tests.failed == 0)
    dump("OK\n");
  else
    dump("FAIL\n");
  quit();
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
      dump("console: " + message);
  }
};

window.addEventListener(
  "load",
  function() {
    var cService = Cc['@mozilla.org/consoleservice;1'].getService()
                   .QueryInterface(Ci.nsIConsoleService);
    cService.registerListener(consoleListener);

    try {
      var ioService = Cc["@mozilla.org/network/io-service;1"]
                      .getService(Ci.nsIIOService);
      var resProt = ioService.getProtocolHandler("resource")
                    .QueryInterface(Ci.nsIResProtocolHandler);
      var environ = Cc["@mozilla.org/process/environment;1"]
                    .getService(Ci.nsIEnvironment);

      if (!environ.exists("HARNESS_OPTIONS"))
        throw new Error("HARNESS_OPTIONS env var must exist.");

      var options = JSON.parse(environ.get("HARNESS_OPTIONS"));

      for (name in options.resources) {
        var dir = Cc['@mozilla.org/file/local;1']
                  .createInstance(Ci.nsILocalFile);
        dir.initWithPath(options.resources[name]);
        if (!(dir.exists() && dir.isDirectory))
          throw new Error("directory not found: " + dir.path);
        var dirUri = ioService.newFileURI(dir);
        resProt.setSubstitution(name, dirUri);
      }

      var jsm = {};
      Cu.import(options.loader, jsm);
      loader = new jsm.Loader({rootPaths: options.rootPaths});
      loader.require("run-suites").run({onDone: onDone,
                                        onPass: function() {
                                          dump(".");
                                        },
                                        verbose: options.verbose});
    } catch (e) {
      try {
        dump(loader.require("traceback").format(e) + "\n" + e + "\n");
      } catch (otherError) {
        // There's an error in the traceback module or the loader
        // couldn't even initialize, fall back to a super lame-looking
        // traceback display.
        dump(e + " (" + e.fileName + ":" + e.lineNumber + ")\n");
        if (e.stack)
          dump("stack:\n" + e.stack + "\n");
      }
      dump("FAIL\n");
      quit();
    }
  },
  false
);
