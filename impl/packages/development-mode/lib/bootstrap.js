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
 * The Original Code is Jetpack SDK.
 *
 * The Initial Developer of the Original Code is
 * Atul Varma <atul@mozilla.com>.
 * Portions created by the Initial Developer are Copyright (C) 2010
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

var {Cc,Cm,Ci,components} = require("chrome");
var file = require("file");

// A global registry of all Jetpack Programs that we're responsible
// for loading and unloading. Keys are XPCOM contract IDs of 
// the harness services of Jetpack Programs, values are the 
// wrappedJSObject of the harness services themselves.
var gServices = {};

var manager = Cm;
manager.QueryInterface(Ci.nsIComponentRegistrar);

// Attempts to unload and then unregister the XPCOM component with the
// given contract ID and class ID, if it is managed by us.
function maybeUnload(contractID, classID) {
  if (contractID in gServices) {
    try {
      gServices[contractID].unload();
    } catch (e) {
      console.exception(e);
    }
    delete gServices[contractID];
    maybeUnregister(contractID, classID);
  }
}

// Attempts to unregister the XPCOM component with the given
// contract ID and class ID, if it is managed by us.
function maybeUnregister(contractID, classID) {
  try {
    var factory = manager.getClassObjectByContractID(contractID,
                                                     Ci.nsIFactory);
    manager.unregisterFactory(classID, factory);
  } catch (e) {
    console.exception(e);
  }
}

// A quit callable that is passed to the main() function of any
// Jetpack Program we manage. Whenever said program quits, we will
// automatically take care of unloading and unregistering it.
function makeQuit(contractID, classID) {
  return function quit(status) {
    maybeUnload(contractID, classID);
  };
}

function logError(e) {
  console.exception(e);
}

function makeUnloader(contractID, classID) {
  return {unload: function unload() { maybeUnload(contractID, classID); }};
}

// The main public function of this module; given a JSON harness options
// blob and a root directory of where the Jetpack Program
// is installed, takes care of loading the program, running it, and
// unloading its resources when they're no longer needed.
exports.run = function run(options, rootDirPath, dump) {
  var harnessService;
  var contractID = options.bootstrap.contractID;
  var classID = components.ID(options.bootstrap.classID);

  maybeUnload(contractID, classID);
  options.runImmediately = true;

  var rootDir = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
  rootDir.initWithPath(rootDirPath);

  // Note that we're reusing our own bootstrapping code here, rather
  // than directly invoking the target Jetpack Program's bootstrapping
  // infrastructure. If one works differently than the other,
  // we could have problems, but for now we'll assume that this
  // bootstrapping infrastructure is stable.
  var HarnessService = packaging.buildHarnessService(rootDir,
                                                     dump,
                                                     logError,
                                                     makeQuit(contractID,
                                                              classID),
                                                     options);
  var factory = HarnessService.prototype._xpcom_factory;
  var proto = HarnessService.prototype;
  manager.registerFactory(proto.classID,
                          proto.classDescription,
                          proto.contractID,
                          factory);

  try {
    harnessService = factory.createInstance(null, Ci.nsISupports);
    harnessService = harnessService.wrappedJSObject;
    gServices[contractID] = harnessService;
    harnessService.load();
    return makeUnloader(contractID, classID);
  } catch (e) {
    console.exception(e);
    return null;
  }
};

// When this module is unloaded, shut down all currently-running
// Jetpack Programs we manage and free their resources.
require("unload").when(
  function() {
    var argLists = [];
    for (contractID in gServices)
      argLists.push([contractID, gServices[contractID].classID]);

    argLists.forEach(
      function(args) {
        maybeUnload.apply(undefined, args);
      });
  });
