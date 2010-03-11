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

var obSvc = Cc["@mozilla.org/observer-service;1"]
            .getService(Ci.nsIObserverService);

// Parameters:
//
//   rootFileSpec - nsILocalFile corresponding to root of extension
//                  (required).
//
//   dump - function to output string to console (required).
//
//   logError - function to log an exception (required).
//
//   onQuit - function called when the app quits (required).
//
//   options - JSON configuration information passed in from the
//             environment (required).

function buildHarnessService(rootFileSpec, dump, logError,
                             onQuit, options) {
  // The loader for securable modules, typically a Cuddlefish loader.
  var loader;

  // Singleton Harness Service.
  var harnessService;

  // Whether we've initialized or not yet.
  var isStarted;

  // Whether we've been asked to quit or not yet.
  var isQuitting;

  var ioService = Cc["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService);
  var resProt = ioService.getProtocolHandler("resource")
                .QueryInterface(Ci.nsIResProtocolHandler);

  function quit(status) {
    if (status === undefined)
      status = "OK";
    if (status != "OK" && status != "FAIL") {
      dump("Warning: quit() expected 'OK' or 'FAIL' as an " +
           "argument, but got '" + status + "' instead.");
      status = "FAIL";
    }

    if (isQuitting)
      return;

    isQuitting = true;

    if (harnessService)
      harnessService.unload();

    onQuit(status);
  }

  function logErrorAndBail(e) {
    logError(e);
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

  function buildLoader() {
    var compMgr = Components.manager;
    compMgr = compMgr.QueryInterface(Ci.nsIComponentRegistrar);

    for (name in options.resources) {
      var path = options.resources[name];
      var dir;
      if (typeof(path) == "string")
        dir = getDir(path);
      else {
        dir = rootFileSpec.clone();
        path.forEach(function(part) { dir.append(part); });
        ensureIsDir(dir);
      }
      var dirUri = ioService.newFileURI(dir);
      resProt.setSubstitution(name, dirUri);
    }

    var jsm = {};
    Cu.import(options.loader, jsm);
    var packaging = new Packaging();
    var loader = new jsm.Loader({rootPaths: options.rootPaths.slice(),
                                 globals: { packaging: packaging }
                                });
    packaging.__setLoader(loader);
    return loader;
  }

  // This will be exposed as the 'packaging' global to all
  // modules loaded within our loader.

  function Packaging() {
  }

  Packaging.prototype = {
    __setLoader: function setLoader(loader) {
      this.__loader = loader;
    },

    get root() {
      return rootFileSpec.clone();
    },

    get harnessService() {
      return harnessService;
    },

    get buildHarnessService() {
      return buildHarnessService;
    },

    get options() {
      return options;
    },

    getURLForData: function getURLForData(path) {
      var traceback = this.__loader.require("traceback");
      var callerInfo = traceback.get().slice(-2)[0];
      var url = this.__loader.require("url");
      var info = url.parse(callerInfo.filename);
      var pkgName = options.resourcePackages[info.host];
      if (pkgName in options.packageData)
        return url.resolve(options.packageData[pkgName], path);
      else
        throw new Error("No data for package " + pkgName);
    },

    createLoader: function createLoader() {
      return buildLoader();
    }
  };

  // Singleton XPCOM component that is responsible for instantiating
  // a Cuddlefish loader and running the main program, if any.

  function HarnessService() {
    this.wrappedJSObject = this;
  }

  HarnessService.prototype = {
    classDescription: "Harness Service",

    get contractID() { return options.bootstrap.contractID; },

    get classID() { return Components.ID(options.bootstrap.classID); },

    _xpcom_categories: [{ category: "app-startup", service: true }],

    _xpcom_factory: {
      get singleton() {
        return harnessService;
      },

      createInstance: function(outer, iid) {
        if (outer)
          throw Cr.NS_ERROR_NO_AGGREGATION;
        if (!harnessService)
          harnessService = new HarnessService();
        return harnessService.QueryInterface(iid);
      }
    },

    QueryInterface: XPCOMUtils.generateQI([Ci.nsIObserver,
                                           Ci.nsISupportsWeakReference]),

    get loader() {
      if (!loader)
        loader = buildLoader();
      return loader;
    },

    get options() {
      return options;
    },

    load: function Harness_load() {
      if (isStarted)
        return;

      isStarted = true;
      obSvc.addObserver(this, "quit-application-granted", true);
      if (options.main) {
        var program = this.loader.require(options.main);
        program.main(options, {quit: quit});
      }
    },

    unload: function Harness_unload() {
      if (!isStarted)
        return;

      isStarted = false;
      harnessService = null;

      obSvc.removeObserver(this, "quit-application-granted");
      if (loader) {
        loader.unload();
        loader = null;
      }

      for (name in options.resources)
        resProt.setSubstitution(name, null);
    },

    observe: function Harness_observe(subject, topic, data) {
      try {
        switch (topic) {
        case "app-startup":
          this.load();
          break;
        case "quit-application-granted":
          this.unload();
          quit("OK");
          break;
        }
      } catch (e) {
        logErrorAndBail(e);
      }
    }
  };

  var factory = HarnessService.prototype._xpcom_factory;
  if (!factory.wrappedJSObject)
    factory.wrappedJSObject = factory;

  return HarnessService;
}

// This is an error logger of last resort; if we're here, then
// we weren't able to initialize Cuddlefish and display a nice
// traceback through it.

function defaultLogError(e) {
  dump(e + " (" + e.fileName + ":" + e.lineNumber + ")\n");
  if (e.stack)
    dump("stack:\n" + e.stack + "\n");
}

// Builds an onQuit() function that writes a result file if necessary
// and does some other extra things to enhance developer ergonomics.

function buildDevQuit(options) {
  // Absolute path to a file that we put our result code in. Ordinarily
  // we'd just exit the process with a zero or nonzero return code, but
  // there doesn't appear to be a way to do this in XULRunner.
  var resultFile = options.resultFile;

  // Whether we've written resultFile or not.
  var fileWritten = false;

  // Whether to quit the application when we're done. We need to support
  // not quitting the app when done on Windows, so users have time to
  // look at the console log before it disappears on exit.
  var quitOnFinish = false;

  if ('noQuit' in options)
    quitOnFinish = !options.noQuit;

  function attemptQuit() {
    var appStartup = Cc['@mozilla.org/toolkit/app-startup;1'].
                     getService(Ci.nsIAppStartup);
    appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
  }

  return function onQuit(result) {
    dump(result + "\n");

    function writeResult() {
      if (!fileWritten)
        try {
          var file = Cc["@mozilla.org/file/local;1"]
                     .createInstance(Ci.nsILocalFile);
          file.initWithPath(resultFile);

          var foStream = Cc["@mozilla.org/network/file-output-stream;1"]
                         .createInstance(Ci.nsIFileOutputStream);
          foStream.init(file, -1, -1, 0);
          foStream.write(result, result.length);
          foStream.close();
          fileWritten = true;
        } catch (e) {
          dump(e + "\n");
        }
    }

    function writeResultAndQuit() {
      writeResult();
      attemptQuit();
    }

    if (quitOnFinish)
      writeResultAndQuit();
    else {
      try {
        // If there aren't any windows active, then we'll be quitting
        // regardless, so make a trivial new one that keeps our app
        // alive.
        try {
          var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                   .getService(Ci.nsIWindowWatcher);
          var text = "Close this window to quit.";
          var window = ww.openWindow(null, "data:text/plain," + text,
                                     "harness", "centerscreen", null);
        } catch (e) {
          // We're already in the process of quitting, so write the
          // result file and return.
          writeResult();
          return;
        }

        var interfaces = [Ci.nsIObserver, Ci.nsISupportsWeakReference];
        var quitObserver = {
          observe: function observe() { writeResult(); },
          QueryInterface: XPCOMUtils.generateQI(interfaces)
        };

        obSvc.addObserver(quitObserver, "quit-application-granted", true);
        window.addEventListener("close", writeResultAndQuit, false);
      } catch (e) {
        dump(e + "\n");
      }
    }
  };
}

function getDefaults(rootFileSpec) {
  // Default options to pass back.
  var options;

  try {
    var environ = Cc["@mozilla.org/process/environment;1"]
                  .getService(Ci.nsIEnvironment);

    var jsonData;
    if (environ.exists("HARNESS_OPTIONS"))
      jsonData = environ.get("HARNESS_OPTIONS");
    else {
      var optionsFile = rootFileSpec.clone();
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
  } catch (e) {
    defaultLogError(e);
    throw e;
  }

  var onQuit = function() {};

  if ('resultFile' in options)
    onQuit = buildDevQuit(options);

  return {options: options, onQuit: onQuit};
}

function NSGetModule(compMgr, fileSpec) {
  var rootFileSpec = fileSpec.parent.parent;
  var defaults = getDefaults(rootFileSpec);
  var HarnessService = buildHarnessService(rootFileSpec,
                                           dump,
                                           defaultLogError,
                                           defaults.onQuit,
                                           defaults.options);
  return XPCOMUtils.generateModule([HarnessService]);
}
