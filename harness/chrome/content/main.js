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

function logErrorAndBail(e) {
  // This is an error logger of last resort; if we're here, then
  // we weren't able to initialize Cuddlefish and display a nice
  // traceback through it.
  dump(e + " (" + e.fileName + ":" + e.lineNumber + ")\n");
  if (e.stack)
    dump("stack:\n" + e.stack + "\n");
  dump("FAIL\n");
  quit();
}

function getDir(path) {
  var dir = Cc['@mozilla.org/file/local;1']
            .createInstance(Ci.nsILocalFile);
  dir.initWithPath(path);
  if (!(dir.exists() && dir.isDirectory))
    throw new Error("directory not found: " + dir.path);
  return dir;
}

function bootstrapAndRunTests() {
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

    var compMgr = Components.manager;
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);

    for each (dirName in options.components) {
      var dir = getDir(dirName);
      compMgr.autoRegister(dir);
    }

    for (name in options.resources) {
      var dir = getDir(options.resources[name]);
      var dirUri = ioService.newFileURI(dir);
      resProt.setSubstitution(name, dirUri);
    }

    var jsm = {};
    Cu.import(options.loader, jsm);
    var rootPaths = options.rootPaths.slice();
    rootPaths.push(window.location.href);

    var loader = new jsm.Loader({rootPaths: rootPaths});
    var runner = loader.require("test-runner");

    options.print = function() { dump.apply(undefined, arguments); };

    options.onDone = function onDone(tests) {
      if (loader)
        try {
          loader.unload();
          loader = null;
        } catch (e) {
          logErrorAndBail(e);
        }
      if (tests.passed > 0 && tests.failed == 0)
        dump("OK\n");
      else
        dump("FAIL\n");
      quit();
    };

    runner.runTests(options);
  } catch (e) {
    logErrorAndBail(e);
  }
}

window.addEventListener("load", bootstrapAndRunTests, false);
