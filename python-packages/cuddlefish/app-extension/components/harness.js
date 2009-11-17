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

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

// Whether to quit the application when we're done.
var quitOnFinish = true;

// JSON configuration information passed in from the environment.
var options;

// Whether we've initialized or not yet.
var isStarted;

// Whether we've been asked to quit or not yet.
var isQuitting;

// nsILocalFile corresponding to this file.
var myFile;

// Absolute path to a file that we put our result code in. Ordinarily
// we'd just exit the process with a zero or nonzero return code, but
// there doesn't appear to be a way to do this in XULRunner.
var resultFile;

function quit(result) {
  if (isQuitting)
    return;

  isQuitting = true;

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

  if (quitOnFinish) {
    var appStartup = Cc['@mozilla.org/toolkit/app-startup;1'].
                     getService(Ci.nsIAppStartup);
    appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
  }
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

function ensureIsDir(dir) {
  if (!(dir.exists() && dir.isDirectory))
    throw new Error("directory not found: " + dir.path);
}

function getDir(path) {
  var dir = Cc['@mozilla.org/file/local;1']
            .createInstance(Ci.nsILocalFile);
  dir.initWithPath(path);
  ensureIsDir(dir);
  return dir;
}

function bootstrap() {
  if (isStarted)
    return;

  isStarted = true;

  try {
    var ioService = Cc["@mozilla.org/network/io-service;1"]
                    .getService(Ci.nsIIOService);
    var resProt = ioService.getProtocolHandler("resource")
                  .QueryInterface(Ci.nsIResProtocolHandler);

    var compMgr = Components.manager;
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);

    for each (dirName in options.components) {
      var dir = getDir(dirName);
      compMgr.autoRegister(dir);
    }

    for (name in options.resources) {
      var path = options.resources[name];
      var dir;
      if (typeof(path) == "string")
        dir = getDir(path);
      else {
        dir = myFile.parent.parent;
        path.forEach(function(part) { dir.append(part); });
        ensureIsDir(dir);
      }
      var dirUri = ioService.newFileURI(dir);
      resProt.setSubstitution(name, dirUri);
    }

    var jsm = {};
    Cu.import(options.loader, jsm);
    var rootPaths = options.rootPaths.slice();

    var loader = new jsm.Loader({rootPaths: rootPaths});

    var obsvc = loader.require("observer-service");
    obsvc.add("quit-application-granted",
              function() {
                try {
                  loader.unload();
                  loader = null;
                  quit("OK");
                } catch (e) {
                  logErrorAndBail(e);
                }
              });

    options.quit = quit;
    var program = loader.require(options.main);
    program.main(options);
  } catch (e) {
    logErrorAndBail(e);
  }
}

function HarnessService() {}
HarnessService.prototype = {
  classDescription: "Harness Service",

  get contractID() { return options.bootstrap.contractID; },

  get classID() { return Components.ID(options.bootstrap.classID); },

  _xpcom_categories: [{ category: "app-startup", service: true }],

  QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                         Ci.nsISupportsWeakReference]),

  observe: function Harness_observe(subject, topic, data) {
    if (topic == "app-startup")
      bootstrap();
  }
};

function NSGetModule(compMgr, fileSpec) {
  myFile = fileSpec;

  try {
    var environ = Cc["@mozilla.org/process/environment;1"]
                  .getService(Ci.nsIEnvironment);

    var jsonData;
    if (environ.exists("HARNESS_OPTIONS")) {
      jsonData = environ.get("HARNESS_OPTIONS");
    } else {
      quitOnFinish = false;
      var optionsFile = myFile.parent.parent;
      optionsFile.append('harness-options.json');
      if (optionsFile.exists()) {
        var fiStream = Cc['@mozilla.org/network/file-input-stream;1']
                       .createInstance(Ci.nsIFileInputStream);
        var siStream = Cc['@mozilla.org/scriptableinputstream;1']
                       .createInstance(Ci.nsIScriptableInputStream);
        fiStream.init(optionsFile, 1, 0, false);
        siStream.init(fiStream);
        var data = new String();
        data += siStream.read(-1);
        siStream.close();
        fiStream.close();
        jsonData = data;
      } else
        throw new Error("HARNESS_OPTIONS env var must exist.");
    }

    options = JSON.parse(jsonData);

    resultFile = options.resultFile;
  } catch (e) {
    logErrorAndBail(e);
  }

  return XPCOMUtils.generateModule([HarnessService]);
}
