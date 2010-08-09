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

exports.Collection = Collection;

/**
 * Adds a collection property to the given object.  Setting the property to a
 * scalar value empties the collection and adds the value.  Setting it to an
 * array empties the collection and adds all the items in the array.
 *
 * @param obj
 *        The property will be defined on this object.
 * @param propName
 *        The name of the property.
 * @param array
 *        If given, this will be used as the collection's backing array.
 */
exports.addCollectionProperty = function addCollProperty(obj, propName, array) {
  array = array || [];
  let publicIface = new Collection(array);

  obj.__defineSetter__(propName, function (itemOrItems) {
    array.splice(0, array.length);
    publicIface.add(itemOrItems);
  });

  obj.__defineGetter__(propName, function () {
    return publicIface;
  });
};

/**
 * A collection is ordered, like an array, but its items are unique, like a set.
 *
 * @param array
 *        The collection is backed by an array.  If this is given, it will be
 *        used as the backing array.  This way the caller can fully control the
 *        collection.  Otherwise a new empty array will be used, and no one but
 *        the collection will have access to it.
 */
function Collection(array) {
  array = array || [];

  /**
   * Provides iteration over the collection.  Items are yielded in the order
   * they were added.
   */
  this.__iterator__ = function Collection___iterator__() {
    let items = array.slice();
    for (let i = 0; i < items.length; i++)
      yield items[i];
  };

  /**
   * The number of items in the collection.
   */
  this.__defineGetter__("length", function Collection_get_length() {
    return array.length;
  });

  /**
   * Adds a single item or an array of items to the collection.  Any items
   * already contained in the collection are ignored.
   *
   * @param  itemOrItems
   *         An item or array of items.
   * @return The collection.
   */
  this.add = function Collection_add(itemOrItems) {
    let items = toArray(itemOrItems);
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (array.indexOf(item) < 0)
        array.push(item);
    }
    return this;
  };

  /**
   * Removes a single item or an array of items from the collection.  Any items
   * not contained in the collection are ignored.
   *
   * @param  itemOrItems
   *         An item or array of items.
   * @return The collection.
   */
  this.remove = function Collection_remove(itemOrItems) {
    let items = toArray(itemOrItems);
    for (let i = 0; i < items.length; i++) {
      let idx = array.indexOf(items[i]);
      if (idx >= 0)
        array.splice(idx, 1);
    }
    return this;
  };
};

function toArray(itemOrItems) {
  let isArr = itemOrItems &&
              itemOrItems.constructor &&
              itemOrItems.constructor.name === "Array";
  return isArr ? itemOrItems : [itemOrItems];
}
