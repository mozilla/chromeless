// This file just runs all test suites we've white-listed as being 
// compatible with E10s. Once we're done with the porting effort,
// we'll just enable cfx's '--e10s' option by default and remove
// this file.

// This is just to serve as an indicator not to run these tests in
// the addon process.
require("chrome");

const E10S_COMPATIBLE_TEST_SUITES = [
  'test-api-utils.js',
  'test-es5.js',
  'test-traits-core.js',
  'test-traits.js',
  'test-list.js',
  'test-self.js'
];

exports.runE10SCompatibleTestSuites = function(test) {
  var xulApp = require("xul-app");
  if (xulApp.is("Firefox") &&
      xulApp.versionInRange(xulApp.version, "4.0b7", "4.0b8pre")) {
    test.pass("Due to bug 609066, Firefox 4.0b7 will never pass this test, " +
              "so we'll skip it.");
    return;
  }
  
  if (packaging.enableE10s) {
    // Don't worry about running these E10S-compatible test
    // suites, cfx will find them by default because its
    // '--e10s' option is enabled.
    test.pass("'cfx --e10s' detected, skipping this test.");
    return;
  }

  var {TestFinder} = require("unit-test-finder");
  var {TestRunner} = require("unit-test");
  var url = require("url");

  var thisDir = url.toFilename(url.URL('./', __url__));
  var finder = new TestFinder({
    dirs: [thisDir],
    filter: function(name) {
      return E10S_COMPATIBLE_TEST_SUITES.indexOf(name) != -1;
    },
    testInProcess: false,
    testOutOfProcess: true
  });
  var runner = new TestRunner();
  finder.findTests(function(tests) {
    test.assert(tests.length >= 1, "must find at least one test");
    runner.startMany({
      tests: tests,
      onDone: function(runner) {
        test.assertEqual(runner.failed, 0,
                         "No tests in addon process should have failed");
        test.assert(runner.passed > 0,
                    "Some tests in addon process must have been run");
        test.failed += runner.failed;
        test.passed += runner.passed;
        test.done();
      }
    });
  });
  test.waitUntilDone();
};
