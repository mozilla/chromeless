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

const {Cc, Ci} = require("chrome");

var appInfo = Cc["@mozilla.org/xre/app-info;1"]
              .getService(Ci.nsIXULAppInfo);

var ID = exports.ID = appInfo.ID;
var name = exports.name = appInfo.name;
var version = exports.version = appInfo.version;
var platformVersion = exports.platformVersion = appInfo.platformVersion;

// The following mapping of application names to GUIDs was taken from:
// 
//   https://addons.mozilla.org/en-US/firefox/pages/appversions
//
// Using the GUID instead of the app's name is preferable because sometimes
// re-branded versions of a product have different names: for instance,
// Firefox, Minefield, Iceweasel, and Shiretoko all have the same
// GUID.

var ids = exports.ids = {
  Firefox: "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}",
  Mozilla: "{86c18b42-e466-45a9-ae7a-9b95ba6f5640}",
  Sunbird: "{718e30fb-e89b-41dd-9da7-e25a45638b28}",
  SeaMonkey: "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}",
  Fennec: "{a23983c0-fd0e-11dc-95ff-0800200c9a66}",
  Thunderbird: "{3550f703-e582-4d05-9a08-453d09bdfdc6}"
};

var is = exports.is = function is(name) {
  if (!(name in ids))
    throw new Error("Unkown Mozilla Application: " + name);
  return ID == ids[name];
};

var isOneOf = exports.isOneOf = function isOneOf(names) {
  for (var i = 0; i < names.length; i++)
    if (is(names[i]))
      return true;
  return false;
};

/**
 * Use this to check whether the given version (e.g. xulApp.platformVersion)
 * is in the given range. Versions must be in version comparator-compatible
 * format. See MDC for details:
 * https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIVersionComparator
 */
var versionInRange = exports.versionInRange =
function versionInRange(version, lowInclusive, highExclusive) {
  var vc = Cc["@mozilla.org/xpcom/version-comparator;1"]
           .getService(Ci.nsIVersionComparator);
  return (vc.compare(version, lowInclusive) >= 0) &&
         (vc.compare(version, highExclusive) < 0);
}

