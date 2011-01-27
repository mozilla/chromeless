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

const apiUtils = require("api-utils");

exports.testPublicConstructor = function (test) {
  function PrivateCtor() {}
  PrivateCtor.prototype = {};

  let PublicCtor = apiUtils.publicConstructor(PrivateCtor);
  test.assert(
    PrivateCtor.prototype.isPrototypeOf(PublicCtor.prototype),
    "PrivateCtor.prototype should be prototype of PublicCtor.prototype"
  );

  function testObj(useNew) {
    let obj = useNew ? new PublicCtor() : PublicCtor();
    test.assert(obj instanceof PublicCtor,
                "Object should be instance of PublicCtor");
    test.assert(obj instanceof PrivateCtor,
                "Object should be instance of PrivateCtor");
    test.assert(PublicCtor.prototype.isPrototypeOf(obj),
                "PublicCtor's prototype should be prototype of object");
    test.assertEqual(obj.constructor, PublicCtor,
                     "Object constructor should be PublicCtor");
  }
  testObj(true);
  testObj(false);
};

exports.testValidateOptionsEmpty = function (test) {
  let val = apiUtils.validateOptions(null, {});
  assertObjsEqual(test, val, {});

  val = apiUtils.validateOptions(null, { foo: {} });
  assertObjsEqual(test, val, {});

  val = apiUtils.validateOptions({}, {});
  assertObjsEqual(test, val, {});

  val = apiUtils.validateOptions({}, { foo: {} });
  assertObjsEqual(test, val, {});
};

exports.testValidateOptionsNonempty = function (test) {
  let val = apiUtils.validateOptions({ foo: 123 }, {});
  assertObjsEqual(test, val, {});

  val = apiUtils.validateOptions({ foo: 123, bar: 456 },
                                 { foo: {}, bar: {}, baz: {} });
  assertObjsEqual(test, val, { foo: 123, bar: 456 });
};

exports.testValidateOptionsMap = function (test) {
  let val = apiUtils.validateOptions({ foo: 3, bar: 2 }, {
    foo: { map: function (v) v * v },
    bar: { map: function (v) undefined }
  });
  assertObjsEqual(test, val, { foo: 9, bar: undefined });
};

exports.testValidateOptionsMapException = function (test) {
  let val = apiUtils.validateOptions({ foo: 3 }, {
    foo: { map: function () { throw new Error(); }}
  });
  assertObjsEqual(test, val, { foo: 3 });
};

exports.testValidateOptionsOk = function (test) {
  let val = apiUtils.validateOptions({ foo: 3, bar: 2, baz: 1 }, {
    foo: { ok: function (v) v },
    bar: { ok: function (v) v }
  });
  assertObjsEqual(test, val, { foo: 3, bar: 2 });

  test.assertRaises(
    function () apiUtils.validateOptions({ foo: 2, bar: 2 }, {
      bar: { ok: function (v) v > 2 }
    }),
    'The option "bar" is invalid.',
    "ok should raise exception on invalid option"
  );

  test.assertRaises(
    function () apiUtils.validateOptions(null, { foo: { ok: function (v) v }}),
    'The option "foo" is invalid.',
    "ok should raise exception on invalid option"
  );
};

exports.testValidateOptionsIs = function (test) {
  let opts = {
    array: [],
    boolean: true,
    func: function () {},
    nul: null,
    number: 1337,
    object: {},
    string: "foo",
    undef1: undefined
  };
  let requirements = {
    array: { is: ["array"] },
    boolean: { is: ["boolean"] },
    func: { is: ["function"] },
    nul: { is: ["null"] },
    number: { is: ["number"] },
    object: { is: ["object"] },
    string: { is: ["string"] },
    undef1: { is: ["undefined"] },
    undef2: { is: ["undefined"] }
  };
  let val = apiUtils.validateOptions(opts, requirements);
  assertObjsEqual(test, val, opts);

  test.assertRaises(
    function () apiUtils.validateOptions(null, {
      foo: { is: ["object", "number"] }
    }),
    'The option "foo" must be one of the following types: object, number',
    "Invalid type should raise exception"
  );
};

exports.testValidateOptionsMapIsOk = function (test) {
  let [map, is, ok] = [false, false, false];
  let val = apiUtils.validateOptions({ foo: 1337 }, {
    foo: {
      map: function (v) v.toString(),
      is: ["string"],
      ok: function (v) v.length > 0
    }
  });
  assertObjsEqual(test, val, { foo: "1337" });

  let requirements = {
    foo: {
      is: ["object"],
      ok: function () test.fail("is should have caused us to throw by now")
    }
  };
  test.assertRaises(
    function () apiUtils.validateOptions(null, requirements),
    'The option "foo" must be one of the following types: object',
    "is should be used before ok is called"
  );
};

exports.testValidateOptionsErrorMsg = function (test) {
  test.assertRaises(
    function () apiUtils.validateOptions(null, {
      foo: { ok: function (v) v, msg: "foo!" }
    }),
    "foo!",
    "ok should raise exception with customized message"
  );
};

exports.testValidateMapWithMissingKey = function (test) {
  let val = apiUtils.validateOptions({ }, {
    foo: {
      map: function (v) v || "bar"
    }
  });
  assertObjsEqual(test, val, { foo: "bar" });

  val = apiUtils.validateOptions({ }, {
    foo: {
      map: function (v) { throw "bar" }
    }
  });
  assertObjsEqual(test, val, { });
};

exports.testAddIterator = function testAddIterator(test) {
  let obj = {};
  let keys = ["foo", "bar", "baz"];
  let vals = [1, 2, 3];
  let keysVals = [["foo", 1], ["bar", 2], ["baz", 3]];
  apiUtils.addIterator(
    obj,
    function keysValsGen() {
      for each (let keyVal in keysVals)
        yield keyVal;
    }
  );

  let keysItr = [];
  for (let key in obj)
    keysItr.push(key);
  test.assertEqual(keysItr.length, keys.length,
                   "the keys iterator returns the correct number of items");
  for (let i = 0; i < keys.length; i++)
    test.assertEqual(keysItr[i], keys[i], "the key is correct");

  let valsItr = [];
  for each (let val in obj)
    valsItr.push(val);
  test.assertEqual(valsItr.length, vals.length,
                   "the vals iterator returns the correct number of items");
  for (let i = 0; i < vals.length; i++)
    test.assertEqual(valsItr[i], vals[i], "the val is correct");

  let keysValsItr = [];
  for (let keyVal in Iterator(obj))
    keysValsItr.push(keyVal);
  test.assertEqual(keysValsItr.length, keysVals.length, "the keys/vals " +
                   "iterator returns the correct number of items");
  for (let i = 0; i < keysVals.length; i++) {
    test.assertEqual(keysValsItr[i][0], keysVals[i][0], "the key is correct");
    test.assertEqual(keysValsItr[i][1], keysVals[i][1], "the val is correct");
  }

  let keysOnlyItr = [];
  for (let key in Iterator(obj, true /* keysonly */))
    keysOnlyItr.push(key);
  test.assertEqual(keysOnlyItr.length, keysVals.length, "the keys only " +
                   "iterator returns the correct number of items");
  for (let i = 0; i < keysVals.length; i++)
    test.assertEqual(keysOnlyItr[i], keysVals[i][0], "the key is correct");
};

function assertObjsEqual(test, obj1, obj2) {
  var items = 0;
  for (let [key, val] in Iterator(obj1)) {
    items++;
    test.assert(key in obj2, "obj1 key should be present in obj2");
    test.assertEqual(obj2[key], val, "obj1 value should match obj2 value");
  }
  for (let [key, val] in Iterator(obj2)) {
    items++;
    test.assert(key in obj1, "obj2 key should be present in obj1");
    test.assertEqual(obj1[key], val, "obj2 value should match obj1 value");
  }
  if (!items)
    test.assertEqual(JSON.stringify(obj1), JSON.stringify(obj2),
                     "obj1 should have same JSON representation as obj2");
}
