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

var timer = require("timer");

exports.findAndRunTests = function findAndRunTests(options) {
  var TestFinder = require("unit-test-finder").TestFinder;
  var finder = new TestFinder({
    dirs: options.dirs,
    filter: options.filter,
    testInProcess: options.testInProcess,
    testOutOfProcess: options.testOutOfProcess
  });
  var runner = new TestRunner({fs: options.fs});
  finder.findTests(
    function (tests) {
      runner.startMany({tests: tests,
    staticArgs: options.staticArgs, 
                        onDone: options.onDone});
    });
};

var TestRunner = exports.TestRunner = function TestRunner(options) {
  if (options) {
    this.fs = options.fs;
  }
  memory.track(this);
  this.passed = 0;
  this.failed = 0;
  this.testRunSummary = [];
};

TestRunner.prototype = {
  toString: function toString() "[object TestRunner]",

  DEFAULT_PAUSE_TIMEOUT: 10000,

  _logTestFailed: function _logTestFailed(why) {
    this.test.errors[why]++;
    if (!this.testFailureLogged) {
      console.error("TEST FAILED: " + this.test.name + " (" + why + ")");
      this.testFailureLogged = true;
    }
  },

  makeSandboxedLoader: function makeSandboxedLoader(options) {
    if (!this.fs)
      console.error("Hey, either you didn't pass .fs when building the" +
                    " TestRunner, or you used 'new' when calling" +
                    " test.makeSandboxedLoader. Don't do that.");

    if (!options)
      options = {console: console};
    options.fs = this.fs;

    var Cuddlefish = require("cuddlefish");

    if ("moduleOverrides" in options) {
      var moduleOverrides = options.moduleOverrides;
      delete options.moduleOverrides;
      function getModuleExports(basePath, module) {
        if (module in moduleOverrides)
          return moduleOverrides[module];
        return null;
      }
      options.getModuleExports = getModuleExports;
    }

    return new Cuddlefish.Loader(options);
  },

  pass: function pass(message) {
    console.info("pass:", message);
    this.passed++;
    this.test.passed++;
  },

  fail: function fail(message) {
    this._logTestFailed("failure");
    console.error("fail:", message);
    console.trace();
    this.failed++;
    this.test.failed++;
  },

  exception: function exception(e) {
    this._logTestFailed("exception");
    console.exception(e);
    this.failed++;
    this.test.failed++;
  },

  assertMatches: function assertMatches(string, regexp, message) {
    if (regexp.test(string)) {
      if (!message)
        message = uneval(string) + " matches " + uneval(regexp);
      this.pass(message);
    } else {
      var no = uneval(string) + " doesn't match " + uneval(regexp);
      if (!message)
        message = no;
      else
        message = message + " (" + no + ")";
      this.fail(message);
    }
  },

  assertRaises: function assertRaises(func, predicate, message) {
    try {
      func();
      if (message)
        this.fail(message + " (no exception thrown)");
      else
        this.fail("function failed to throw exception");
    } catch (e) {
      var errorMessage;
      if (typeof(e) == "string")
        errorMessage = e;
      else
        errorMessage = e.message;
      if (typeof(predicate) == "string")
        this.assertEqual(errorMessage, predicate, message);
      else
        this.assertMatches(errorMessage, predicate, message);
    }
  },

  assert: function assert(a, message) {
    if (!a) {
      if (!message)
        message = "assertion failed, value is " + a;
      this.fail(message);
    } else
      this.pass(message || "assertion successful");
  },

  assertNotEqual: function assertNotEqual(a, b, message) {
    if (a != b) {
      if (!message)
        message = "a != b != " + uneval(a);
      this.pass(message);
    } else {
      var equality = uneval(a) + " == " + uneval(b);
      if (!message)
        message = equality;
      else
        message += " (" + equality + ")";
      this.fail(message);
    }
  },

  assertEqual: function assertEqual(a, b, message) {
    if (a == b) {
      if (!message)
        message = "a == b == " + uneval(a);
      this.pass(message);
    } else {
      var inequality = uneval(a) + " != " + uneval(b);
      if (!message)
        message = inequality;
      else
        message += " (" + inequality + ")";
      this.fail(message);
    }
  },

  done: function done() {
    if (!this.isDone) {
      this.isDone = true;
      if (this.waitTimeout !== null) {
        timer.clearTimeout(this.waitTimeout);
        this.waitTimeout = null;
      }
      if (this.test.passed == 0 && this.test.failed == 0) {
        this._logTestFailed("empty test");
        this.failed++;
        this.test.failed++;
      }
      
      this.testRunSummary.push({
        name: this.test.name,
        passed: this.test.passed,
        failed: this.test.failed,
        errors: [error for (error in this.test.errors)].join(", ")
      });
      
      if (this.onDone !== null) {
        var onDone = this.onDone;
        var self = this;
        this.onDone = null;
        timer.setTimeout(function() { onDone(self); }, 0);
      }
    }
  },

  waitUntilDone: function waitUntilDone(ms) {
    if (ms === undefined)
      ms = this.DEFAULT_PAUSE_TIMEOUT;

    var self = this;

    function tiredOfWaiting() {
      self._logTestFailed("timed out");
      self.failed++;
      self.test.failed++;
      self.done();
    }

    this.waitTimeout = timer.setTimeout(tiredOfWaiting, ms);
  },

  startMany: function startMany(options) {
    function runNextTest(self) {
      var test = options.tests.shift();
      if (test)
        self.start({staticArgs: options.staticArgs, test: test, onDone: runNextTest});
      else
        options.onDone(self);
    }
    runNextTest(this);
  },

  start: function start(options) {
    this.test = options.test;
    this.staticArgs = options.staticArgs;
    this.test.passed = 0;
    this.test.failed = 0;
    this.test.errors = {};

    this.isDone = false;
    this.onDone = options.onDone;
    this.waitTimeout = null;

    try {
      this.test.testFunction(this);
    } catch (e) {
      this.exception(e);
    }
    if (this.waitTimeout === null)
      this.done();
  }
};
