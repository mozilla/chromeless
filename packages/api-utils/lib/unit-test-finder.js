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

// We don't actually use chrome directly, but we do access the 
// filesystem and scan it to dynamically import modules, so
// we put this here to tell the module loader to give us
// permission to require() whatever we want.
require("chrome");

var file = require("file");

var TestFinder = exports.TestFinder = function TestFinder(options) {
  memory.track(this);
  this.dirs = options.dirs || [];
  this.filter = options.filter || function() { return true; };
  this.testInProcess = options.testInProcess === false ? false : true;
  this.testOutOfProcess = options.testOutOfProcess === true ? true : false;
};

TestFinder.prototype = {
  _makeTest: function _makeTest(suite, name, test) {
    function runTest(runner) {
      console.info("executing '" + suite + "." + name + "'");
      test(runner);
    }
    return runTest;
  },

  findTests: function findTests(cb) {
    var self = this;
    var tests = [];
    var remoteSuites = [];
    var filter;

    if (typeof(this.filter) == "string") {
      var filterRegex = new RegExp(self.filter);
      filter = function(name) {
        return filterRegex.test(name);
      };
    } else if (typeof(this.filter) == "function")
      filter = this.filter;

    this.dirs.forEach(
      function(dir) {
        var suites = [name.slice(0, -3)
                      for each (name in file.list(dir))
                      if (/^test-.*\.js$/.test(name) && filter(name))];

        suites.forEach(
          function(suite) {
            var loader = require("parent-loader");
            var url = loader.fs.resolveModule(null, suite);
            var moduleInfo = packaging.getModuleInfo(url);
            var module = require(suite);
            if (self.testInProcess)
              for (name in module)
                  tests.push({
                    testFunction: self._makeTest(suite, name, module[name]),
                    name: suite + "." + name
                  });
            if (!moduleInfo.needsChrome)
              remoteSuites.push(suite);
          });
      });

    if (this.testOutOfProcess && remoteSuites.length > 0) {
      var process = require("e10s").AddonProcess();
      var finderHandle = process.createHandle();
      finderHandle.onTestsFound = function(testsFound) {
        cb(tests.concat(testsFound));
      };
      process.send("startMain", "find-tests", {
        suites: remoteSuites,
        finderHandle: finderHandle
      });
    } else
      cb(tests);
  }
};
