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
 *   Drew Willcoxon <adw@mozilla.com>
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

const {Cc,Ci,Cm,Cr,Cu} = require("chrome");

var jsm = {};
Cu.import("resource://gre/modules/XPCOMUtils.jsm", jsm);
var utils = exports.utils = jsm.XPCOMUtils;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

var factories = [];

function Factory(options) {
  memory.track(this);

  this.wrappedJSObject = this;
  this.create = options.create;
  this.uuid = options.uuid;
  this.name = options.name;
  this.contractID = options.contractID;

  Cm.registerFactory(this.uuid,
                     this.name,
                     this.contractID,
                     this);

  var self = this;

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

    factories.splice(index, 1);
    Cm.unregisterFactory(this.uuid, this);
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

  Cm.QueryInterface(Ci.nsIComponentRegistrar);
  Cm.autoRegister(file);
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
  return Cm.getClassObjectByContractID(contractID, iid);
};

/**
 * Returns an Error instance that is a more descriptive version of the raw XPCOM
 * errOrResult.  opts is used by some exceptions to include helpful info in
 * their messages such as a filename, and as such its properties depend on the
 * type of exception being thrown.  opts need not be defined for errors that
 * don't use it.  See below for a list of supported options.
 *
 * If there is no friendly version of errOrResult, then if it's an nsIException,
 * an Error whose message is errOrResult's message is returned; if it's a
 * result, an Error with a simple numeric message is returned; and if it's an
 * Error, it itself is returned.
 *
 * @param  errOrResult
 *         An nsIException, Error, or one of the Components.results.
 * @param  opts
 *         An optional options object.  The following properies are supported:
 *         @prop filename
 *               The name of the file being accessed when the exception was
 *               thrown, if any.
 * @return An Error instance.
 */
var friendlyError = exports.friendlyError =
  function friendlyError(errOrResult, opts) {
    opts = opts || {};
    var result = errOrResult instanceof Ci.nsIException ?
                 errOrResult.result :
                 errOrResult;

    // Common options to be used below.
    var filename = opts.filename || "(filename unknown)";

    // If you add an error message, update testFriendlyError in test-xpcom.js.
    // If the message includes options, also update this method's comment.
    switch (result) {
    case Cr.NS_BASE_STREAM_CLOSED:
      return new Error("The stream is closed and cannot be read or written.");
    case Cr.NS_ERROR_FILE_IS_DIRECTORY:
      return new Error("The stream was opened on a directory, which cannot " +
                       "be read or written: " + filename);
    case Cr.NS_ERROR_FILE_NOT_FOUND:
      return new Error("path does not exist: " + filename);
    }

    // errOrResult should be an nsIException, ...
    if (errOrResult instanceof Ci.nsIException)
      return new Error("XPCOM error: " + errOrResult.message);

    // ... one of Components.results, a number, ...
    if (typeof(errOrResult) === "number") {

      // Look up the result's name to make the message a little nicer.
      for (let [name, val] in Iterator(Cr)) {
        if (val === errOrResult) {
          return new Error("XPCOM error " + name +
                           " (0x" + errOrResult.toString(16) + ")");
        }
      }
    }

    // ... or an Error.
    if (errOrResult.constructor.name === "Error")
      return errOrResult;

    // We've been called wrong if we get here.
    return new Error("Unknown error: " + errOrResult);
  };

require("unload").when(
  function() {
    var copy = factories.slice();
    copy.reverse();
    copy.forEach(function(factory) { factory.unregister(); });
  });
