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

const collection = require("collection");

exports.testAddRemove = function (test) {
  let coll = new collection.Collection();
  compare(test, coll, []);
  addRemove(test, coll, [], false);
};

exports.testAddRemoveBackingArray = function (test) {
  let items = ["foo"];
  let coll = new collection.Collection(items);
  compare(test, coll, items);
  addRemove(test, coll, items, true);

  items = ["foo", "bar"];
  coll = new collection.Collection(items);
  compare(test, coll, items);
  addRemove(test, coll, items, true);
};

exports.testProperty = function (test) {
  let obj = makeObjWithCollProp();
  compare(test, obj.coll, []);
  addRemove(test, obj.coll, [], false);

  // Test single-value set.
  let items = ["foo"];
  obj.coll = items[0];
  compare(test, obj.coll, items);
  addRemove(test, obj.coll, items, false);

  // Test array set.
  items = ["foo", "bar"];
  obj.coll = items;
  compare(test, obj.coll, items);
  addRemove(test, obj.coll, items, false);
};

exports.testPropertyBackingArray = function (test) {
  let items = ["foo"];
  let obj = makeObjWithCollProp(items);
  compare(test, obj.coll, items);
  addRemove(test, obj.coll, items, true);

  items = ["foo", "bar"];
  obj = makeObjWithCollProp(items);
  compare(test, obj.coll, items);
  addRemove(test, obj.coll, items, true);
};

// Adds some values to coll and then removes them.  initialItems is an array
// containing coll's initial items.  isBacking is true if initialItems is coll's
// backing array; the point is that updates to coll should affect initialItems
// if that's the case.
function addRemove(test, coll, initialItems, isBacking) {
  let items = isBacking ? initialItems : initialItems.slice(0);
  let numInitialItems = items.length;

  // Test add(val).
  let numInsertions = 5;
  for (let i = 0; i < numInsertions; i++) {
    compare(test, coll, items);
    coll.add(i);
    if (!isBacking)
      items.push(i);
  }
  compare(test, coll, items);

  // Add the items we just added to make sure duplicates aren't added.
  for (let i = 0; i < numInsertions; i++)
    coll.add(i);
  compare(test, coll, items);

  // Test remove(val).  Do a kind of shuffled remove.  Remove item 1, then
  // item 0, 3, 2, 5, 4, ...
  for (let i = 0; i < numInsertions; i++) {
    let val = i % 2 ? i - 1 :
              i === numInsertions - 1 ? i : i + 1;
    coll.remove(val);
    if (!isBacking)
      items.splice(items.indexOf(val), 1);
    compare(test, coll, items);
  }
  test.assertEqual(coll.length, numInitialItems,
                   "All inserted items should be removed");

  // Remove the items we just removed.  coll should be unchanged.
  for (let i = 0; i < numInsertions; i++)
    coll.remove(i);
  compare(test, coll, items);

  // Test add and remove([val1, val2]).
  let newItems = [0, 1];
  coll.add(newItems);
  compare(test, coll, isBacking ? items : items.concat(newItems));
  coll.remove(newItems);
  compare(test, coll, items);
  test.assertEqual(coll.length, numInitialItems,
                   "All inserted items should be removed");
}

// Asserts that the items in coll are the items of array.
function compare(test, coll, array) {
  test.assertEqual(coll.length, array.length,
                   "Collection length should be correct");
  let numItems = 0;
  for (let item in coll) {
    test.assertEqual(item, array[numItems], "Items should be equal");
    numItems++;
  }
  test.assertEqual(numItems, array.length,
                   "Number of items in iteration should be correct");
}

// Returns a new object with a collection property named "coll".  backingArray,
// if defined, will create the collection with that backing array.
function makeObjWithCollProp(backingArray) {
  let obj = {};
  collection.addCollectionProperty(obj, "coll", backingArray);
  return obj;
}
