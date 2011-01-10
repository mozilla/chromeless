// While this adapter is complete, it most likely isn't very secure,
// in that it allows the remote addon process to ask for any content
// on the host filesystem.

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

if (this.chrome) {
  exports.id = chrome.call("self:id");
  exports.data = {
    load: function(path) {
      return chrome.call("self:load", path, new Error().stack);
    },
    url: function(path) {
      return chrome.call("self:url", path, new Error().stack);
    }
  };
} else {
  // Here we basically have to reimplement the self module.

  let file = require("file");
  let url = require("url");
  let traceback = require("traceback");

  let packageData = packaging.options.packageData;
  let resourcePackages = packaging.options.resourcePackages;
  let id = packaging.jetpackID;

  function caller(stack, levels) {
    var e = {
      stack: stack
    };
    let callerInfo = traceback.fromException(e).slice(-2-levels)[0];
    let info = url.URL(callerInfo.filename);
    let pkgName = resourcePackages[info.host];
    // pkgName is "my-package", suitable for lookup in options["packageData"]
    return pkgName;
  }

  function getURL(name, stack, level) {
    let pkgName = caller(stack, level);
    // packageData[] = "resource://jetpack-JID-PKGNAME-data/"
    if (pkgName in packageData)
      return url.URL(name, packageData[pkgName]).toString();
    throw new Error("No data for package " + pkgName);
  }

  exports.register = function(addon) {
    addon.registerCall("self:id", function(name) {
      return id;
    });
    addon.registerCall("self:load", function(name, path, stack) {
      let data_url = getURL(path, stack, 1);
      let fn = url.toFilename(data_url);
      let data = file.read(fn);
      return data;
    });
    addon.registerCall("self:url", function(name, path, stack) {
      return getURL(path, stack, 1);
    });
  }
}
