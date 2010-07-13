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
 * The Original Code is String Bundle.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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

const {Cc,Ci} = require("chrome");
const apiUtils = require("api-utils");

/**
 * A bundle of strings.
 *
 * @param url {String}
 *        the URL of the string bundle
 */
exports.StringBundle = apiUtils.publicConstructor(function StringBundle(url) {

  let stringBundle = Cc["@mozilla.org/intl/stringbundle;1"].
                     getService(Ci.nsIStringBundleService).
                     createBundle(url);

  this.__defineGetter__("url", function () url);

  /**
   * Get a string from the bundle.
   *
   * @param name {String}
   *        the name of the string to get
   * @param args {array} [optional]
   *        an array of arguments that replace occurrences of %S in the string
   *
   * @returns {String} the value of the string
   */
  this.get = function strings_get(name, args) {
    try {
      if (args)
        return stringBundle.formatStringFromName(name, args, args.length);
      else
        return stringBundle.GetStringFromName(name);
    }
    catch(ex) {
      // f.e. "Component returned failure code: 0x80004005 (NS_ERROR_FAILURE)
      // [nsIStringBundle.GetStringFromName]"
      throw new Error("String '" + name + "' could not be retrieved from the " +
                      "bundle due to an unknown error (it doesn't exist?).");
    }
  },

  /**
   * Iterate the strings in the bundle.
   *
   */
  apiUtils.addIterator(
    this,
    function keysValsGen() {
      let enumerator = stringBundle.getSimpleEnumeration();
      while (enumerator.hasMoreElements()) {
        let elem = enumerator.getNext().QueryInterface(Ci.nsIPropertyElement);
        yield [elem.key, elem.value];
      }
    }
  );
});
