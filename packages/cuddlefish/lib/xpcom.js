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

var jsm = {};
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm", jsm);
var utils = exports.utils = jsm.XPCOMUtils;

var manager = Components.manager;
manager.QueryInterface(Ci.nsIComponentRegistrar);

var categoryManager = Cc["@mozilla.org/categorymanager;1"]
                      .getService(Ci.nsICategoryManager);

var factories = [];

function Factory(options) {
  memory.track(this);

  this.wrappedJSObject = this;
  this.create = options.create;
  this.uuid = options.uuid;
  this.name = options.name;
  this.contractID = options.contractID;
  this.categories = options.categories || [];

  manager.registerFactory(this.uuid,
                          this.name,
                          this.contractID,
                          this);

  var self = this;
  this.categories.forEach(
    function(category) {
      categoryManager.addCategoryEntry(category,
                                       self.name,
                                       self.contractID,
                                       true,
                                       true);
    });

  factories.push(this);
}

Factory.prototype = {
  createInstance: function(outer, iid) {
    try {
      if (outer)
        throw Cr.NS_ERROR_NO_AGGREGATION;
      return (new this.create()).QueryInterface(iid);
    } catch (e) {
      console.exception(e);
      if (e instanceof Ci.nsIException)
        throw e;
      else
        throw Cr.NS_ERROR_FAILURE;
    }
  },
  unregister: function() {
    var index = factories.indexOf(this);
    if (index == -1)
      throw new Error("factory already unregistered");

    var self = this;
    this.categories.forEach(
      function(category) {
        categoryManager.deleteCategoryEntry(category,
                                            self.name,
                                            true);
      });

    factories.splice(index, 1);
    manager.unregisterFactory(this.uuid, this);
  },
  QueryInterface: utils.generateQI([Ci.nsIFactory])
};

var makeUuid = exports.makeUuid = function makeUuid() {
  var uuidGenerator = Cc["@mozilla.org/uuid-generator;1"]
                      .getService(Ci.nsIUUIDGenerator);
  var uuid = uuidGenerator.generateUUID();
  return uuid;
};

var autoRegister = exports.autoRegister = function autoRegister(path) {
  // TODO: This assumes that the url points to a directory
  // that contains subdirectories corresponding to OS/ABI and then
  // further subdirectories corresponding to Gecko platform version.
  // we should probably either behave intelligently here or allow
  // the caller to pass-in more options if e.g. there aren't
  // Gecko-specific binaries for a component (which will be the case
  // if only frozen interfaces are used).

  var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULAppInfo);
  var runtime = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULRuntime);

  var osDirName = runtime.OS + "_" + runtime.XPCOMABI;
  var platformVersion = appInfo.platformVersion.substring(0, 5);

  var file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
  file.initWithPath(path);
  file.append(osDirName);
  file.append(platformVersion);

  if (!(file.exists() && file.isDirectory()))
    throw new Error("component not available for OS/ABI " +
                    osDirName + " and platform " + platformVersion);

  var mgr = Components.manager;
  mgr.QueryInterface(Ci.nsIComponentRegistrar);
  mgr.autoRegister(file);
};

var register = exports.register = function register(options) {
  options = {__proto__: options};
  if (!options.uuid)
    options.uuid = makeUuid();
  return new Factory(options);
};

var getClass = exports.getClass = function getClass(contractID, iid) {
  if (!iid)
    iid = Ci.nsISupports;
  return Components.manager.getClassObjectByContractID(contractID,
                                                       iid);
};

var getCategory = exports.getCategory = function getCategory(name) {
  var enumerator = categoryManager.enumerateCategory(name);
  var objects = [];
  while (enumerator.hasMoreElements())
    objects.push(enumerator.getNext());
  return objects;
};

require("unload").when(
  function() {
    var copy = factories.slice();
    copy.reverse();
    copy.forEach(function(factory) { factory.unregister(); });
  });
