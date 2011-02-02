/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim:set ts=2 sw=2 sts=2 et filetype=javascript
 * ***** BEGIN LICENSE BLOCK *****
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
 *   Irakli Gozalishvili <gozala@mozilla.com>
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

const file = require("file");
const prefs = require("preferences-service");

const QUOTA_PREF = "extensions.addon-sdk.simple-storage.quota";

let {Cc,Ci} = require("chrome");
let storeFile = Cc["@mozilla.org/file/directory_service;1"].
                getService(Ci.nsIProperties).
                get("ProfD", Ci.nsIFile);
storeFile.append("jetpack");
storeFile.append(packaging.jetpackID);
storeFile.append("simple-storage");
storeFile.append("store.json");
let storeFilename = storeFile.path;

exports.testSetGet = function (test) {
  test.waitUntilDone();

  // Load the module once, set a value.
  let loader = newLoader(test);
  let ss = loader.require("simple-storage");
  manager(loader).jsonStore.onWrite = function (storage) {
    test.assert(file.exists(storeFilename), "Store file should exist");

    // Load the module again and make sure the value stuck.
    loader = newLoader(test);
    ss = loader.require("simple-storage");
    manager(loader).jsonStore.onWrite = function (storage) {
      file.remove(storeFilename);
      test.done();
    };
    test.assertEqual(ss.storage.foo, val, "Value should persist");
    loader.unload();
  };
  let val = "foo";
  ss.storage.foo = val;
  test.assertEqual(ss.storage.foo, val, "Value read should be value set");
  loader.unload();
};

exports.testSetGetRootArray = function (test) {
  setGetRoot(test, [1, 2, 3], function (arr1, arr2) {
    if (arr1.length !== arr2.length)
      return false;
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i])
        return false;
    }
    return true;
  });
};

exports.testSetGetRootBool = function (test) {
  setGetRoot(test, true);
};

exports.testSetGetRootFunction = function (test) {
  setGetRootError(test, function () {},
                  "Setting storage to a function should fail");
};

exports.testSetGetRootNull = function (test) {
  setGetRoot(test, null);
};

exports.testSetGetRootNumber = function (test) {
  setGetRoot(test, 3.14);
};

exports.testSetGetRootObject = function (test) {
  setGetRoot(test, { foo: 1, bar: 2 }, function (obj1, obj2) {
    for (let [prop, val] in Iterator(obj1)) {
      if (!(prop in obj2) || obj2[prop] !== val)
        return false;
    }
    for (let [prop, val] in Iterator(obj2)) {
      if (!(prop in obj1) || obj1[prop] !== val)
        return false;
    }
    return true;
  });
};

exports.testSetGetRootString = function (test) {
  setGetRoot(test, "sho' 'nuff");
};

exports.testSetGetRootUndefined = function (test) {
  setGetRootError(test, undefined, "Setting storage to undefined should fail");
};

exports.testEmpty = function (test) {
  let loader = newLoader(test);
  let ss = loader.require("simple-storage");
  loader.unload();
  test.assert(!file.exists(storeFilename), "Store file should not exist");
};

exports.testMalformed = function (test) {
  let stream = file.open(storeFilename, "w");
  stream.write("i'm not json");
  stream.close();
  let loader = newLoader(test);
  let ss = loader.require("simple-storage");
  let empty = true;
  for (let key in ss.storage) {
    empty = false;
    break;
  }
  test.assert(empty, "Malformed storage should cause root to be empty");
  loader.unload();
};

// Go over quota and handle it by listener.
exports.testQuotaExceededHandle = function (test) {
  test.waitUntilDone();
  prefs.set(QUOTA_PREF, 18);

  let loader = newLoader(test);
  let ss = loader.require("simple-storage");
  ss.on("OverQuota", function () {
    test.pass("OverQuota was emitted as expected");
    test.assertEqual(this, ss, "`this` should be simple storage");
    ss.storage = { x: 4, y: 5 };

    manager(loader).jsonStore.onWrite = function () {
      loader = newLoader(test);
      ss = loader.require("simple-storage");
      let numProps = 0;
      for (let prop in ss.storage)
        numProps++;
      test.assert(numProps, 2,
                  "Store should contain 2 values: " + ss.storage.toSource());
      test.assertEqual(ss.storage.x, 4, "x value should be correct");
      test.assertEqual(ss.storage.y, 5, "y value should be correct");
      manager(loader).jsonStore.onWrite = function (storage) {
        prefs.reset(QUOTA_PREF);
        test.done();
      };
      loader.unload();
    };
    loader.unload();
  });
  // This will be JSON.stringify()ed to: {"a":1,"b":2,"c":3} (19 bytes)
  ss.storage = { a: 1, b: 2, c: 3 };
  manager(loader).jsonStore.write();
};

// Go over quota but don't handle it.  The last good state should still persist.
exports.testQuotaExceededNoHandle = function (test) {
  test.waitUntilDone();
  prefs.set(QUOTA_PREF, 5);

  let loader = newLoader(test);
  let ss = loader.require("simple-storage");

  manager(loader).jsonStore.onWrite = function (storage) {
    loader = newLoader(test);
    ss = loader.require("simple-storage");
    test.assertEqual(ss.storage, val,
                     "Value should have persisted: " + ss.storage);
    ss.storage = "some very long string that is very long";
    ss.on("OverQuota", function () {
      test.pass("OverQuota emitted as expected");
      manager(loader).jsonStore.onWrite = function () {
        test.fail("Over-quota value should not have been written");
      };
      loader.unload();

      loader = newLoader(test);
      ss = loader.require("simple-storage");
      test.assertEqual(ss.storage, val,
                       "Over-quota value should not have been written, " +
                       "old value should have persisted: " + ss.storage);
      loader.unload();
      prefs.reset(QUOTA_PREF);
      test.done();
    });
    manager(loader).jsonStore.write();
  };

  let val = "foo";
  ss.storage = val;
  loader.unload();
};

exports.testQuotaUsage = function (test) {
  test.waitUntilDone();

  let quota = 21;
  prefs.set(QUOTA_PREF, quota);

  let loader = newLoader(test);
  let ss = loader.require("simple-storage");

  // {"a":1} (7 bytes)
  ss.storage = { a: 1 };
  test.assertEqual(ss.quotaUsage, 7 / quota, "quotaUsage should be correct");

  // {"a":1,"bb":2} (14 bytes)
  ss.storage = { a: 1, bb: 2 };
  test.assertEqual(ss.quotaUsage, 14 / quota, "quotaUsage should be correct");

  // {"a":1,"bb":2,"cc":3} (21 bytes)
  ss.storage = { a: 1, bb: 2, cc: 3 };
  test.assertEqual(ss.quotaUsage, 21 / quota, "quotaUsage should be correct");

  manager(loader).jsonStore.onWrite = function () {
    prefs.reset(QUOTA_PREF);
    test.done();
  };
  loader.unload();
};

exports.testUninstall = function (test) {
  test.waitUntilDone();
  let loader = newLoader(test);
  let ss = loader.require("simple-storage");
  manager(loader).jsonStore.onWrite = function () {
    test.assert(file.exists(storeFilename), "Store file should exist");

    loader = newLoader(test);
    ss = loader.require("simple-storage");
    loader.unload("uninstall");
    test.assert(!file.exists(storeFilename), "Store file should be removed");
    test.done();
  };
  ss.storage.foo = "foo";
  loader.unload();
};

function manager(loader) {
  return loader.findSandboxForModule("simple-storage").globalScope.manager;
}

function newLoader(test) {
  return test.makeSandboxedLoader({ globals: { packaging: packaging } });
}

function setGetRoot(test, val, compare) {
  test.waitUntilDone();

  compare = compare || function (a, b) a === b;

  // Load the module once, set a value.
  let loader = newLoader(test);
  let ss = loader.require("simple-storage");
  manager(loader).jsonStore.onWrite = function () {
    test.assert(file.exists(storeFilename), "Store file should exist");

    // Load the module again and make sure the value stuck.
    loader = newLoader(test);
    ss = loader.require("simple-storage");
    manager(loader).jsonStore.onWrite = function () {
      file.remove(storeFilename);
      test.done();
    };
    test.assert(compare(ss.storage, val), "Value should persist");
    loader.unload();
  };
  ss.storage = val;
  test.assert(compare(ss.storage, val), "Value read should be value set");
  loader.unload();
}

function setGetRootError(test, val, msg) {
  let pred = "storage must be one of the following types: " +
             "array, boolean, null, number, object, string";
  let loader = newLoader(test);
  let ss = loader.require("simple-storage");
  test.assertRaises(function () ss.storage = val, pred, msg);
  loader.unload();
}
