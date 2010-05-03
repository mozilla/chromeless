/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
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
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Drew Willcoxon <adw@mozilla.com> (Original Author)
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
 * Returns a function C that creates instances of privateCtor.  C may be called
 * with or without the new keyword.  The prototype of each instance returned
 * from C is C.prototype, and C.prototype is an object whose prototype is
 * privateCtor.prototype.  Instances returned from C will therefore be instances
 * of both C and privateCtor.
 *
 * @param  privateCtor
 *         A constructor.
 * @return A function that makes new instances of privateCtor.
 */
exports.publicConstructor = function publicConstructor(privateCtor) {
  function PublicCtor() {
    let obj = { constructor: PublicCtor, __proto__: PublicCtor.prototype };
    memory.track(obj, privateCtor.name);
    privateCtor.apply(obj, arguments);
    return obj;
  };
  PublicCtor.prototype = { __proto__: privateCtor.prototype };
  return PublicCtor;
};

/**
 * Returns a validated options dictionary given some requirements.  If any of
 * the requirements are not met, an exception is thrown.
 *
 * @param  options
 *         An object, the options dictionary to validate.  It's not modified.
 *         If it's null or otherwise falsey, an empty object is assumed.
 * @param  requirements
 *         An object whose keys are the expected keys in options.  Any key in
 *         options that is not present in requirements is ignored.  Each value
 *         in requirements is itself an object describing the requirements of
 *         its key.  There are three optional keys in this object:
 *           map: A function that's passed the value of the key in options.  The
 *                return value of this function is used as the value of the key.
 *                All exceptions thrown when calling the function are caught and
 *                discarded, and in that case the value of the key is its value
 *                in options.
 *           ok:  A function that's passed the value of the key in options or,
 *                if map is defined, map's return value.  If it returns true, or
 *                if this function is undefined, the value is accepted.
 *           msg: If ok returns false, an error is thrown.  This string will be
 *                used as its message.  If undefined, a generic message is used.
 * @return An object whose keys are those keys in requirements that are also in
 *         options and whose values are the corresponding return values of map
 *         or the corresponding values in options.  Note that any keys in
 *         requirements that are not in options are not in the returned object.
 */
exports.validateOptions = function validateOptions(options, requirements) {
  options = options || {};
  let validatedOptions = {};

  for (let [key, requirement] in Iterator(requirements)) {
    let [optsVal, keyInOpts] = (key in options) ?
                               [options[key], true] :
                               [undefined, false];
    if (requirement.map) {
      try {
        optsVal = requirement.map(optsVal);
      }
      catch (err) {}
    }
    if (requirement.ok && !requirement.ok(optsVal)) {
      let msg = requirement.msg || 'The option "' + key + '" is invalid.';
      throw new Error(msg);
    }
    if (keyInOpts)
      validatedOptions[key] = optsVal;
  }

  return validatedOptions;
};
