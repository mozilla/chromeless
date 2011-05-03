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
 * The Original Code is Chromeless.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *    David Murdoch
 *    Lloyd Hilaiel <lloyd@hilaiel.com>
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

/**
 * Allow access and manipulation of the chromeless platforms cookie store.
 */

const {Cc, Ci} = require("chrome");
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

let cookieManager = Cc["@mozilla.org/cookiemanager;1"].
                        getService(Ci.nsICookieManager);

/**
 * Remove a specific cookie.
 * @param host the host that the cookie is associated with
 * @param name the name of the cookie
 * @param path the path of the cookie
 * @param blocked the blocked status of the cookie
 *
 */
exports.remove = function(host, name, path, blocked)
{
    cookieManager.remove(host, name, path, blocked);
};

/**
 * Remove all cookies.
 */
exports.removeAll = function()
{
    cookieManager.removeAll();
};

/**
 * Get all cookies
 * @returns {array} An array of objects representing cookies.  Each object has `.host`,
 * `.name`, `.expires`, `.value`, `.path`, and `.blocked` attributes.
 */
exports.getAllCookies = function() {
    var cookies = [],
        enumerator = cookieManager.enumerator;
    while(enumerator.hasMoreElements()) {
      var cookie = enumerator.getNext().QueryInterface(Ci.nsICookie);
      // use COWs to expose some properties of the underlying object.
      cookie = {
        host: cookie.host,
        name: cookie.name,
        expires: cookie.expires,
        value: cookie.value,
        path: cookie.path,
        blocked: cookie.blocked
      };
      cookies.push(cookie);
    }
    return cookies;
};
