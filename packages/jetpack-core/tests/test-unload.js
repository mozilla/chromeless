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
 *   Atul Varma <atul@mozilla.com> (Original Author)
 *   Drew Willcoxon <adw@mozilla.com>
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

var unload = require("unload");

exports.testUnloading = function(test) {
  var loader = test.makeSandboxedLoader();
  var ul = loader.require("unload");
  var unloadCalled = 0;
  function unload() { unloadCalled++; }
  var obj1 = {};
  var obj2 = {};
  ul.addMethod(obj1, unload);
  ul.addMethod(obj2, unload);
  loader.unload();
  test.assertEqual(unloadCalled, 2,
                   "All unloaders are called on unload.");
};

exports.testAddMethod = function(test) {
  var obj = {unloadCalled: 0};
  function unloadObj() { this.unloadCalled++; }

  unload.addMethod(obj, unloadObj);

  obj.unload();
  test.assertEqual(obj.unloadCalled, 1,
                   "unloader function should be called");
  obj.unload();
  test.assertEqual(obj.unloadCalled, 1,
                   "unloader func should not be called more than once");
};

exports.testEnsure = function(test) {
  test.assertRaises(function() { unload.ensure({}); },
                    "object has no 'unload' property",
                    "passing obj with no unload prop should fail");

  var called = 0;
  var obj = {unload: function() { called++; }};

  unload.ensure(obj);
  obj.unload();
  test.assertEqual(called, 1,
                   "unload() should be called");
  obj.unload();
  test.assertEqual(called, 1,
                   "unload() should be called only once");
};

exports.testReason = function (test) {
  var reason = "Reason doesn't actually have to be anything in particular.";
  var loader = test.makeSandboxedLoader();
  var ul = loader.require("unload");
  ul.when(function (rsn) {
    test.assertEqual(rsn, reason,
                     "when() reason should be reason given to loader");
  });
  var obj = {
    unload: function (rsn) {
      test.assertEqual(rsn, reason,
                       "ensure() reason should be reason given to loader");
    }
  };
  ul.ensure(obj);
  loader.unload(reason);
};
