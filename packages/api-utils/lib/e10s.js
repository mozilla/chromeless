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

let {Cc, Ci, Cr} = require('chrome');

let url = require("url");
let file = require("file");
let errors = require("errors");

let jetpackService = Cc["@mozilla.org/jetpack/service;1"]
                     .getService(Ci.nsIJetpackService);

function AddonProcess(jetpack) {
  var syncListeners = {};

  this.on = function(name, cb) {
    jetpack.registerReceiver(name, function() {
      try {
        // Intentionally do not return the return value of
        // the function; we want developers to use registerCall() for that.
        cb.apply(undefined, arguments);
      } catch (e) {
        console.exception(e);
      }
    });
  };

  this.registerCall = function(name, cb) {
    if (name in syncListeners)
      throw new Error("call already registered for '" + name + "'");
    syncListeners[name] = true;
    jetpack.registerReceiver(name, errors.catchAndReturn(cb));
  };

  this.send = function() {
    return jetpack.sendMessage.apply(this, arguments);
  };
  
  this.createHandle = function() {
    return jetpack.createHandle();
  };

  this.destroy = function() {
    try {
      jetpack.destroy();
    } catch (e if e.result == Cr.NS_ERROR_NOT_INITIALIZED) {}
  };
}

function makeScriptFrom(fs, moduleURL) {
  // TODO: Why can't we just return fs.getFile(moduleURL) here?
  return {
    filename: moduleURL,
    contents: fs.getFile(moduleURL).contents
  };
}

var defaultConsole = console;

exports.AddonProcess = function createAddonProcess(options) {
  if (!options)
    options = {};

  var jetpack = jetpackService.createJetpack();  
  var process = new AddonProcess(jetpack);
  var registeredModules = {};

  var console = options.console || defaultConsole;
  var pkg = options.packaging || packaging;

  // Whenever our add-on is disabled or uninstalled, we want to
  // destroy the remote process.

  require("unload").when(function() {
                           process.destroy();
                           process = null;
                         });

  // Set up message receivers that the remote process will use to
  // communicate with us.

  ['log', 'debug', 'info', 'warn', 'error'].forEach(function(method) {
    process.on("console:" + method, function(name, args) {
      console[method].apply(console, args);
    });
  });

  function remoteException(exception) {
    return {
      toString: function toString() {
        return "Error: " + this.message;
      },
      __proto__: exception
    };
  }
  
  process.on("quit", function(name, status) {
    if (options.quit)
      options.quit(status);
  });

  process.on("console:trace", function(name, exception) {
    var traceback = require("traceback");
    var stack = traceback.fromException(remoteException(exception));
    console.log(traceback.format(stack.slice(0, -2)));
  });

  process.on("console:exception", function(name, exception) {
    console.exception(remoteException(exception));
  });
  
  jetpack.registerReceiver("dump", function(name, msg) {
    dump(msg);
  });

  jetpack.registerReceiver(
    "core:exception",
    function(name, exception) {
      console.log("An exception occurred in the child Jetpack process.");
      console.exception(remoteException(exception));
    });

  process.registerCall(
    "require",
    function(name, base, path) {
      var loader = options.loader || require("parent-loader");
      var parentFS = loader.fs;
      var moduleURL = parentFS.resolveModule(base, path);

      if (!moduleURL)
        return {code: "not-found"};

      var moduleInfo = pkg.getModuleInfo(moduleURL);
      var moduleName = path;

      function maybeImportAdapterModule() {
        var adapterModuleName = moduleName + "-e10s-adapter";
        var adapterModuleURL = parentFS.resolveModule(base,
                                                      adapterModuleName);
        var adapterModuleInfo = null;
        if (adapterModuleURL)
          adapterModuleInfo = pkg.getModuleInfo(adapterModuleURL);

        if (moduleInfo['e10s-adapter'] != adapterModuleURL) {
          console.warn("Adapter module URL is " + adapterModuleURL +
                       " but expected " + moduleInfo['e10s-adapter']);
          return {code: "error"};
        }

        if (adapterModuleInfo) {
          // e10s adapter found!
          try {
            if (!(adapterModuleURL in registeredModules)) {
              // This e10s adapter has already been loaded for this
              // addon process, and we only really need to give it the
              // absolute URL of the adapter.
              registeredModules[adapterModuleURL] = true;
              loader.require(adapterModuleName).register(process);
            }
          } catch (e) {
            console.exception(e);
            return {code: "error"};
          }
          return {
            code: "ok",
            needsMessaging: true,
            script: makeScriptFrom(parentFS, adapterModuleURL)
          };
        }
        
        return null;
      }

      if (moduleInfo) {
        if (moduleInfo.needsChrome) {
          return maybeImportAdapterModule() || {code: "access-denied"};
        } else {

          // Even if a module doesn't explicitly require chrome privileges, if
          // an e10s adapter exists for it, use it, because said module might
          // import other modules that require chrome.
          //
          // In the future we may want to look at the module's dependencies to
          // determine whether importing an adapter is a better idea.

          return maybeImportAdapterModule() || {
            code: "ok",
            needsMessaging: false,
            script: makeScriptFrom(parentFS, moduleURL)
          };
        }
      } else {
        return maybeImportAdapterModule() || {code: "not-found"};
      }
    });

  var bootURL = require("self").data.url("bootstrap-remote-process.js");
  var bootFilename = url.toFilename(bootURL);
  var bootJS = file.read(bootFilename);

  // The try ... catch is a workaround for bug 589308.
  jetpack.evalScript('//@line 1 "' + bootFilename + '"\n' +
                     "try { " + bootJS + " } catch (e) { " +
                     "sendMessage('core:exception', e); }");

  process.send("addInjectedSandboxScript",
               require("cuddlefish").es5code);

  return process;
};
