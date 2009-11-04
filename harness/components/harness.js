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
 * The Original Code is Weave.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *  Dan Mills <thunder@mozilla.com>
 *  Atul Varma <atul@mozilla.com>
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

const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
const HARNESS_ID = "xulapp@toolness.com";

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// Whether we've initialized or not yet.
var isStarted;

// nsILocalFile corresponding to this file.
var myFile;

// Absolute path to a file that we put our result code in. Ordinarily
// we'd just exit the process with a zero or nonzero return code, but
// there doesn't appear to be a way to do this in XULRunner.
var resultFile;

function quit(result) {
  dump(result + "\n");

  if (resultFile) {
    try {
      var file = Cc["@mozilla.org/file/local;1"]
                 .createInstance(Ci.nsILocalFile);
      file.initWithPath(resultFile);

      var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                     .createInstance(Ci.nsIFileOutputStream);
      foStream.init(file, -1, -1, 0);
      foStream.write(result, result.length);
      foStream.close();
    } catch (e) {
      dump(e + "\n");
    }
  }

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
  quit("FAIL");
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

    resultFile = options.resultFile;

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
    var myModules = myFile.parent.parent;
    myModules.append("securable-modules");
    var myModulesURI = ioService.newFileURI(myModules);
    rootPaths.push(myModulesURI.spec);

    var loader = new jsm.Loader({rootPaths: rootPaths});

    if (options.main) {
      var obsvc = loader.require("observer-service");
      obsvc.add("quit-application-granted",
                function() {
                  loader.unload();
                  quit("OK");
                });

      var program = loader.require(options.main);
      program.main(options);
    } else {
      var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
               .getService(Ci.nsIWindowWatcher);
      var window = ww.openWindow(null, "data:text/plain,Running tests...",
                                 "harness", "centerscreen", null);

      var harness = loader.require("harness");

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
          quit("OK");
        else
          quit("FAIL");
      };

      harness.runTests(options);
    }
  } catch (e) {
    logErrorAndBail(e);
  }
}

function startTests() {
  if (!isStarted) {
    isStarted = true;
    bootstrapAndRunTests();
  }
}

function HarnessService() {}
HarnessService.prototype = {
  classDescription: "Harness Service",
  contractID: "@mozilla.org/harness/service;1",
  classID: Components.ID("{74b89fb1-f200-4ae8-a3ec-dd164117f6df}"),
  _xpcom_categories: [{ category: "app-startup", service: true }],

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  observe: function BSS__observe(subject, topic, data) {
    switch (topic) {
    case "app-startup":
      var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                    .getService(Ci.nsIXULAppInfo);
      let obSvc = Cc["@mozilla.org/observer-service;1"]
                  .getService(Ci.nsIObserverService);

      switch (appInfo.ID) {
      case HARNESS_ID:
        startTests();
        break;
      case FIREFOX_ID:
        obSvc.addObserver(this, "sessionstore-windows-restored", true);
        break;
      }
      break;
    case "sessionstore-windows-restored":
      // Firefox-only.
      startTests();
      break;
    }
  }
};

function NSGetModule(compMgr, fileSpec) {
  myFile = fileSpec;
  return XPCOMUtils.generateModule([HarnessService]);
}
