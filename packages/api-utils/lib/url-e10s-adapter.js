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
 * The Original Code is Add-on SDK.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Irakli Gozalishvili <gozala@mozilla.com>
 *   Myk Melez <myk@mozilla.org>
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
  exports.toFilename   = function(spec) chrome.call("url:toFilename", spec);
  exports.fromFilename = function(spec) chrome.call("url:fromFilename", spec);

  let URL = exports.URL = function URL(spec, base) {
    // We have to force the `spec` and `base` arguments, if defined, to be
    // strings before sending them across the process boundary, since the
    // boundary will drop their custom toString() methods if they are URL
    // objects, and the other side depends on being able to convert them to
    // strings.
    let result = chrome.call("url:URL",
                             typeof spec == "undefined" ? spec : "" + spec,
                             typeof base == "undefined" ? base : "" + base);

    let { scheme, userPass, host, port, path } = result.url;

    return Object.create(URL.prototype, {
      scheme:   { value: scheme,    enumerable: true },
      userPass: { value: userPass,  enumerable: true },
      host:     { value: host,      enumerable: true },
      port:     { value: port,      enumerable: true },
      path:     { value: path,      enumerable: true },
      toString: { value: function() chrome.call("url:toString", result.handle) }
    });
  }
}
else {
  const { URL, toFilename, fromFilename } = require("url");

  exports.register = function register(addon) {
    addon.registerCall("url:toFilename", function(name, spec) toFilename(spec));

    addon.registerCall("url:fromFilename",
                       function(name, spec) fromFilename(spec));

    addon.registerCall("url:URL", function(name, spec, base) {
      let url = URL(spec, base);

      // We create a handle to give the addon process access to the toString()
      // method, which cannot traverse the process boundary but also can't be
      // duplicated in the addon process because it accesses private information
      // (the spec of the URL).  The handle doesn't need to be rooted, as it
      // can be GCed as soon as all references to it are removed.
      let handle = addon.createHandle();
      handle.isRooted = false;
      handle.url = url;

      return { url: url, handle: handle };
    });

    addon.registerCall("url:toString",
                       function(name, handle) handle.url.toString());
  }
}
