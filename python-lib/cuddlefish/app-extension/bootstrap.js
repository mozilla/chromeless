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
const Cr = Components.results;

var global = this;

var gHarness;

var ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);

var manager = Components.manager;
manager.QueryInterface(Ci.nsIComponentRegistrar);

function getFile(path) {
  var channel = ios.newChannel(path, null, null);
  var iStream = channel.open();
  var siStream = Cc['@mozilla.org/scriptableinputstream;1']
                 .createInstance(Ci.nsIScriptableInputStream);
  siStream.init(iStream);
  var data = new String();
  data += siStream.read(-1);
  siStream.close();
  iStream.close();
  return {contents: data};
}

// This is an error logger of last resort; if we're here, then
// we weren't able to initialize Cuddlefish and display a nice
// traceback through it.

function defaultLogError(e, print) {
  if (!print)
    print = dump;

  print(e + " (" + e.fileName + ":" + e.lineNumber + ")\n");
  if (e.stack)
    print("stack:\n" + e.stack + "\n");
}

function setupHarness(installPath) {
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

  harnessService.load();
}

function safeSetupHarness(installPath) {
  try {
    if (!gHarness)
      setupHarness(installPath);
  } catch (e) {
    defaultLogError(e);
  };
}

function safeShutdownHarness() {
  if (gHarness) {
    try {
      gHarness.service.unload();
      manager.unregisterFactory(gHarness.classID, gHarness.factory);
    } catch (e) {
      defaultLogError(e);
    }
    
    gHarness = undefined;
  }
}

function install(data, reason) {
  safeSetupHarness(data.installPath);
}

function startup(data, reason) {
  safeSetupHarness(data.installPath);
}

function shutdown(data, reason) {
  safeShutdownHarness();
}

function uninstall(data, reason) {
  safeShutdownHarness();
}
