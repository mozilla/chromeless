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
 *  Drew Willcoxon <adw@mozilla.com>
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

// For more information on the context in which this script is executed, see:
// https://wiki.mozilla.org/Extension_Manager:Bootstrapped_Extensions

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cr = Components.results;

// Object containing information about the XPCOM harness service
// that manages our addon.

var gHarness;

var ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);

var manager = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);

// Dynamically evaluate and initialize the XPCOM component in
// components/harness.js, which bootstraps our addon. (We want to keep
// components/harness.js around so that versions of Gecko that don't
// support rebootless addons can still work.)

function setupHarness(installPath, loadReason) {
  var harnessJs = installPath.clone();
  harnessJs.append("components");
  harnessJs.append("harness.js");
  var path = ios.newFileURI(harnessJs).spec;
  var harness = {};
  var loader = Cc["@mozilla.org/moz/jssubscript-loader;1"]
               .getService(Ci.mozIJSSubScriptLoader);
  loader.loadSubScript(path, harness);

  var defaults = harness.getDefaults(installPath);
  var HarnessService = harness.buildHarnessService(
    installPath,
    defaults.dump,
    defaults.logError,
    defaults.onQuit,
    defaults.options
  );
  var factory = HarnessService.prototype._xpcom_factory;
  var proto = HarnessService.prototype;

  // We want to keep this factory around for the lifetime of
  // the addon so legacy code with access to Components can
  // access the addon if needed.
  manager.registerFactory(proto.classID,
                          proto.classDescription,
                          proto.contractID,
                          factory);

  var harnessService = factory.createInstance(null, Ci.nsISupports);
  harnessService = harnessService.wrappedJSObject;

  gHarness = {
    service: harnessService,
    classID: proto.classID,
    contractID: proto.contractID,
    factory: factory
  };

  harnessService.load(loadReason);
}

function reasonToString(reason) {
  // If you change these names, change them in harness.js's lifeCycleObserver192
  // too.
  switch (reason) {
  case ADDON_INSTALL:
    return "install";
  case ADDON_UNINSTALL:
    return "uninstall";
  case ADDON_ENABLE:
    return "enable";
  case ADDON_DISABLE:
    return "disable";
  case ADDON_UPGRADE:
    return "upgrade";
  case ADDON_DOWNGRADE:
    return "downgrade";
  // The startup and shutdown strings are also used outside of
  // lifeCycleObserver192.
  case APP_STARTUP:
    return "startup";
  case APP_SHUTDOWN:
    return "shutdown";
  }
  return undefined;
}

function install(data, reason) {
  // We shouldn't start up here; startup() will always be called when
  // an extension should load, and install() sometimes gets called when
  // an extension has been installed but is disabled.
}

function startup(data, reason) {
  if (!gHarness)
    setupHarness(data.installPath, reasonToString(reason));
}

function shutdown(data, reason) {
  if (gHarness) {
    var harness = gHarness;
    gHarness = undefined;
    harness.service.unload(reasonToString(reason));
    manager.unregisterFactory(harness.classID, harness.factory);
  }
}

function uninstall(data, reason) {
  // We shouldn't shutdown here; shutdown() will always be called when
  // an extension should shutdown, and uninstall() sometimes gets
  // called when startup() has never been called before it.
}
