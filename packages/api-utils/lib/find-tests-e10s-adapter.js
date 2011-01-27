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

if (this.chrome) {
  var timer = require("timer");
  var ut = require("unit-test");

  chrome.on(
    "runTest",
    function(name, test) {
      var runner = new ut.TestRunner();
      runner.start({
        test: test.testHandle,
        onDone: function() {
          test.passed = runner.test.passed;
          test.failed = runner.test.failed;
          test.errors = runner.test.errors;
          chrome.send("testDone", test);
        }
      });
    });
    
  exports.main = function(options, callbacks) {
    function makeTest(suite, name, test) {
      return function runTest(runner) {
        console.info("executing '" + suite + "." + name + "' remotely");
        test(runner);
      };
    }

    var tests = [];

    options.suites.forEach(function(suite) {
      var module = require(suite);
      for (testName in module) {
        var handle = chrome.createHandle();
        handle.testFunction = makeTest(suite, testName, module[testName]);
        handle.name = suite + "." + testName;
        tests.push({testHandle: handle, name: handle.name});
      }
    });
    chrome.send("testsFound", tests, options.finderHandle);
  }
} else {
  exports.register = function(addon) {
    addon.on("testDone", function(name, remoteTest) {
      var runner = remoteTest.testHandle.runner;
      runner.passed += remoteTest.passed;
      runner.failed += remoteTest.failed;
      runner.test.passed = remoteTest.passed;
      runner.test.failed = remoteTest.failed;
      runner.test.errors = remoteTest.errors;
      runner.done();
    });
    addon.on("testPass", function(name, remoteTest, msg) {
      remoteTest.testHandle.runner.pass(msg);
    });
    addon.on("testFail", function(name, remoteTest, msg) {
      remoteTest.testHandle.runner.fail(msg);
    });
    addon.on("testsFound", function(name, remoteTests,
                                    finderHandle) {
      var tests = [];
      remoteTests.forEach(function(remoteTest) {
        tests.push({
          testFunction: function(runner) {
            remoteTest.testHandle.runner = runner;
            runner.waitUntilDone();
            addon.send("runTest", remoteTest);
          },
          name: remoteTest.name
        });
      });
      finderHandle.onTestsFound(tests);
    });
  };
}
