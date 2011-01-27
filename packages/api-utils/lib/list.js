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
 *   Irakli Gozalishvili <gozala@mozilla.com> (Original Author)
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
"use strict";

const { Trait } = require('traits');

/**
 * @see https://jetpack.mozillalabs.com/sdk/latest/docs/#module/api-utils/list
 */
const Iterable = Trait.compose({
  /**
   * Hash map of key-values to iterate over.
   * Note: That this property can be a getter if you need dynamic behavior.
   * @type {Object}
   */
  _keyValueMap: Trait.required,
  /**
   * Custom iterator providing `Iterable`s enumeration behavior.
   * @param {Boolean} onKeys
   */
  __iterator__: function __iterator__(onKeys, onKeyValue) {
    let map = this._keyValueMap;
    for (let key in map)
      yield onKeyValue ? [key, map[key]] : onKeys ? key : map[key];
  }
});
exports.Iterable = Iterable;

/**
 * An ordered collection (also known as a sequence) disallowing duplicate
 * elements. List is composed out of `Iterable` there for it provides custom
 * enumeration behavior that is similar to array (enumerates only on the
 * elements of the list). List is a base trait and is meant to be a part of
 * composition, since all of it's API is private except length property.
 */
const List = Trait.resolve({ toString: null }).compose({
  _keyValueMap: null,
  /**
   * List constructor can take any number of element to populate itself.
   * @params {Object|String|Number} element
   * @example
   *    List(1,2,3).length == 3 // true
   */
  constructor: function List() {
    this._keyValueMap = [];
    for (let i = 0, ii = arguments.length; i < ii; i++)
      this._add(arguments[i]);
  },
  /**
   * Number of elements in this list.
   * @type {Number}
   */
  get length() this._keyValueMap.length,
   /**
    * Returns a string representing this list.
    * @returns {String}
    */
  toString: function toString() 'List(' + this._keyValueMap + ')',
  /**
   * Returns `true` if this list contains the specified `element`.
   * @param {Object|Number|String} element
   * @returns {Boolean}
   */
  _has: function _has(element) 0 <= this._keyValueMap.indexOf(element),
  /**
   * Appends the specified `element` to the end of this list, if it doesn't
   * contains it. Ignores the call if `element` is already contained.
   * @param {Object|Number|String} element
   */
  _add: function _add(element) {
    let list = this._keyValueMap,
        index = list.indexOf(element);
    if (0 > index)
      list.push(this._public[list.length] = element);
  },
  /**
   * Removes specified `element` from this list, if it contains it.
   * Ignores the call if `element` is not contained.
   * @param {Object|Number|String} element
   */
  _remove: function _remove(element) {
    let list = this._keyValueMap,
        index = list.indexOf(element);
    if (0 <= index) {
      delete this._public[list.length];
      list.splice(index, 1);
      for (let length = list.length; index < length; index++)
        this._public[index] = list[index];
    }
  },
  /**
   * Removes all of the elements from this list.
   */
  _clear: function _clear() {
    for (let i = 0, ii = this._keyValueMap.length; i < ii; i ++)
      delete this._public[i];
    this._keyValueMap.splice(0);
  },
  /**
   * Custom iterator providing `List`s enumeration behavior.
   * We cant reuse `_iterator` that is defined by `Iterable` since it provides
   * iteration in an arbitrary order.
   * @see https://developer.mozilla.org/en/JavaScript/Reference/Statements/for...in
   * @param {Boolean} onKeys
   */
  __iterator__: function __iterator__(onKeys, onKeyValue) {
    let array = this._keyValueMap,
        i = -1;
    for each(let element in array)
      yield onKeyValue ? [++i, element] : onKeys ? ++i : element;
  }
});
exports.List = List;
