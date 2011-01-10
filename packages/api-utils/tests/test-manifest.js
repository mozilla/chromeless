var nullModule = {
  code: '',
  moduleInfo: {
    dependencies: {},
    needsChrome: false
  }
};

var fakeModules = {
  "foo": {
    code: 'require("bar");',
    moduleInfo: {
      dependencies: {"bar": {}},
      needsChrome: false
    }
  },
  "bar": nullModule,
  "sorta-bad": {
    code: 'require("f" + "oo")',
    moduleInfo: {
      dependencies: {},
      needsChrome: false
    }
  },
  "loads-wrong-thing": {
    code: 'require("bar")',
    moduleInfo: {
      dependencies: {"bar": {url: "wrong"} },
      needsChrome: false
    }
  },
  "pure-evil": {
    code: 'require("ch" + "rome")',
    moduleInfo: {
      dependencies: {},
      needsChrome: false
    }
  },
  "es5": nullModule,
};

function createHarness(test, fakeModules) {
  var fakePackaging = {
    getModuleInfo: function getModuleInfo(basePath) {
      if (basePath in fakeModules)
        return fakeModules[basePath].moduleInfo;
      throw new Error("assertion error: no module called " + basePath);
    }
  };

  var fakeFs = {
    resolveModule: function(root, path) {
      if (path in fakeModules)
        return path;
      return null;
    },
    getFile: function(path) {
      return {contents: fakeModules[path].code};
    }
  };

  var warnings = [];
  function checkWarnings(expected, msg) {
    test.assertEqual(JSON.stringify(warnings),
                     JSON.stringify(expected),
                     msg);
    warnings = [];
  }

  var fakeConsole = {
    log: function() {
      console.log.apply(console, arguments);
    },
    warn: function(msg) {
      warnings.push(msg);
    },
    exception: function(e) {
      console.exception(e);
    }
  };

  var loader = require("cuddlefish").Loader({
    packaging: fakePackaging,
    fs: fakeFs,
    console: fakeConsole,
    memory: memory
  });

  return {
    checkWarnings: checkWarnings,
    fs: fakeFs,
    console: fakeConsole,
    loader: loader,
    packaging: fakePackaging
  };
}

exports.testManifest = function(test) {
  let {checkWarnings, loader} = createHarness(test, fakeModules);
  
  checkWarnings([], "init of loader does not trigger warnings");
  
  loader.require("foo"); // this triggers warnings
  checkWarnings(["require(bar) (called from foo) is loading bar, but the manifest couldn't find it", 
                 "require(bar) (called from foo) is loading bar, but the manifest couldn't find it"],
                "require() of non-chrome module w/ expected deps works");

  loader.require("sorta-bad");
  checkWarnings(["undeclared require(foo) called from sorta-bad"],
                "require() of non-chrome module w/ unexpected " +
                "non-chrome dep triggers warning");

  loader.require("loads-wrong-thing"); // also triggers warnings
  checkWarnings(["require(bar) (called from loads-wrong-thing) is loading bar, but is supposed to be loading wrong"
                 ],
                "require() loading wrong module is noticed");

  loader.require("pure-evil");
  checkWarnings(["undeclared require(chrome) called from pure-evil"],
                "require() of non-chrome modulue w/ unexpected " +
                "chrome dep triggers warning");

  test.pass("OK");
}

// E10s Manifest Tests

var e10s = require("e10s");
var xulApp = require("xul-app");

var e10sModules = {
  "superpower-client": {
    code: 'exports.main = ' + uneval(function main(options, callbacks) {
      var superpower;
      try {
        superpower = require("superpower");
        callbacks.quit("OK"); 
      } catch (e) {
        callbacks.quit("FAIL");
      }
    }),
    moduleInfo: {
      dependencies: {"superpower": {url: "superpower-e10s-adapter"}},
      needsChrome: false
    }
  },
  "superpower": {
    code: 'require("chrome")',
    moduleInfo: {
      dependencies: {},
      'e10s-adapter': 'superpower-e10s-adapter',
      needsChrome: true
    }
  },
  "superpower-e10s-adapter": {
    code: 'exports.register = function(addon) {}',
    moduleInfo: {
      dependencies: {},
      needsChrome: false
    }
  },
  "es5": nullModule
};

function copy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function createE10sHarness(test, modules, onQuit) {
  var harness = createHarness(test, modules);

  var process = e10s.AddonProcess({
    packaging: harness.packaging,
    loader: harness.loader,
    console: harness.console,
    quit: function(status) {
      onQuit(status);
      process.destroy();
      test.done();
    }
  });

  test.waitUntilDone();
  harness.process = process;
  return harness;
};

exports.testE10sAdapterWorks = function(test) {
  if (xulApp.is("Firefox") &&
      xulApp.versionInRange(xulApp.version, "4.0b7", "4.0b8pre")) {
    test.pass("Due to bug 609066, Firefox 4.0b7 will never pass this test, " +
              "so we'll skip it.");
    return;
  }

  var harness = createE10sHarness(test, e10sModules, function quit(status) {
    test.assertEqual(status, "OK",
                     "require('superpower') should work");
    harness.checkWarnings([], "no warnings logged");
  });

  harness.process.send("startMain", "superpower-client");  
};

// We want to test to make sure that the runtime behavior matches
// the behavior dictated by the manifest. The most obvious way
// this could diverge is if the hacker adds files to the XPI that
// causes the loader to find a different e10s adapter than the
// one the manifest specifies. Since we don't have an XPI in this
// case, though, it's easier to just hack the manifest to point
// at a different file; the same code is tested.
exports.testE10sAdapterDoesntWorkOnHackedManifest = function(test) {
  if (xulApp.is("Firefox") &&
      xulApp.versionInRange(xulApp.version, "4.0b7", "4.0b8pre")) {
    test.pass("Due to bug 609066, Firefox 4.0b7 will never pass this test, " +
              "so we'll skip it.");
    return;
  }

  var modules = copy(e10sModules);
  modules['superpower'].moduleInfo['e10s-adapter'] = 'somethingelse';

  var harness = createE10sHarness(test, modules, function quit(status) {
    test.assertEqual(status, "FAIL",
                     "require('superpower') should throw");
    harness.checkWarnings([
      'Adapter module URL is superpower-e10s-adapter but expected ' +
      'somethingelse'
    ], "warning logged when found adapter conflicts w/ manifest");
  });

  harness.process.send("startMain", "superpower-client");  
};
