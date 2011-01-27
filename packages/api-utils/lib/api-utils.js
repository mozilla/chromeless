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
 *   Edward Lee <edilee@mozilla.com>
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

// The possible return values of getTypeOf.
const VALID_TYPES = [
  "array",
  "boolean",
  "function",
  "null",
  "number",
  "object",
  "string",
  "undefined",
];

/**
 * Returns a function C that creates instances of privateCtor.  C may be called
 * with or without the new keyword.  The prototype of each instance returned
 * from C is C.prototype, and C.prototype is an object whose prototype is
 * privateCtor.prototype.  Instances returned from C will therefore be instances
 * of both C and privateCtor.  Additionally, the constructor of each instance
 * returned from C is C.
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
  }
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
 *         its key.  There are four optional keys in this object:
 *           map: A function that's passed the value of the key in options.
 *                map's return value is taken as the key's value in the final
 *                validated options, is, and ok.  If map throws an exception
 *                it's caught and discarded, and the key's value is its value in
 *                options.
 *           is:  An array containing any number of the typeof type names.  If
 *                the key's value is none of these types, it fails validation.
 *                Arrays and null are identified by the special type names
 *                "array" and "null"; "object" will not match either.  No type
 *                coercion is done.
 *           ok:  A function that's passed the key's value.  If it returns
 *                false, the value fails validation.
 *           msg: If the key's value fails validation, an exception is thrown.
 *                This string will be used as its message.  If undefined, a
 *                generic message is used, unless is is defined, in which case
 *                the message will state that the value needs to be one of the
 *                given types.
 * @return An object whose keys are those keys in requirements that are also in
 *         options and whose values are the corresponding return values of map
 *         or the corresponding values in options.  Note that any keys not
 *         shared by both requirements and options are not in the returned
 *         object.
 */
exports.validateOptions = function validateOptions(options, requirements) {
  options = options || {};
  let validatedOptions = {};
  let mapThrew = false;

  for (let [key, req] in Iterator(requirements)) {
    let [optsVal, keyInOpts] = (key in options) ?
                               [options[key], true] :
                               [undefined, false];
    if (req.map) {
      try {
        optsVal = req.map(optsVal);
      }
      catch (err) {
        mapThrew = true;
      }
    }
    if (req.is) {
      // Sanity check the caller's type names.
      req.is.forEach(function (typ) {
        if (VALID_TYPES.indexOf(typ) < 0) {
          let msg = 'Internal error: invalid requirement type "' + typ + '".';
          throw new Error(msg);
        }
      });
      if (req.is.indexOf(getTypeOf(optsVal)) < 0)
        throw requirementError(key, req);
    }
    if (req.ok && !req.ok(optsVal))
      throw requirementError(key, req);

    if (keyInOpts || (req.map && !mapThrew))
      validatedOptions[key] = optsVal;
  }

  return validatedOptions;
};

exports.addIterator = function addIterator(obj, keysValsGenerator) {
  obj.__iterator__ = function(keysOnly, keysVals) {
    let keysValsIterator = keysValsGenerator.call(this);

    // "for (.. in ..)" gets only keys, "for each (.. in ..)" gets values,
    // and "for (.. in Iterator(..))" gets [key, value] pairs.
    let index = keysOnly ? 0 : 1;
    while (true)
      yield keysVals ? keysValsIterator.next() : keysValsIterator.next()[index];
  };
};

// Similar to typeof, except arrays and null are identified by "array" and
// "null", not "object".
let getTypeOf = exports.getTypeOf = function getTypeOf(val) {
  let typ = typeof(val);
  if (typ === "object") {
    if (!val)
      return "null";
    if (Array.isArray(val))
      return "array";
  }
  return typ;
}

// Returns a new Error with a nice message.
function requirementError(key, requirement) {
  let msg = requirement.msg;
  if (!msg) {
    msg = 'The option "' + key + '" ';
    msg += requirement.is ?
           "must be one of the following types: " + requirement.is.join(", ") :
           "is invalid.";
  }
  return new Error(msg);
}
