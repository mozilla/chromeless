exports.testManifest = function(test) {
  var nullModule = {
    code: '',
    moduleInfo: {
      dependencies: [],
      needsChrome: false
    }
  };

  var fakeModules = {
    "foo": {
      code: 'require("bar");',
      moduleInfo: {
        dependencies: ["bar"],
        needsChrome: false
      }
    },
    "bar": nullModule,
    "sorta-bad": {
      code: 'require("f" + "oo")',
      moduleInfo: {
        dependencies: [],
        needsChrome: false
      }
    },
    "pure-evil": {
      code: 'require("ch" + "rome")',
      moduleInfo: {
        dependencies: [],
        needsChrome: false
      }
    },
    "es5": nullModule,
  };

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

  warnings = [];
  function checkWarnings(expected, msg) {
    test.assertEqual(JSON.stringify(warnings),
                     JSON.stringify(expected),
                     msg);
    warnings = [];
  }

  var loader = require("cuddlefish").Loader({
    packaging: fakePackaging,
    fs: fakeFs,
    console: {
      warn: function(msg) {
        warnings.push(msg);
      }
    },
    memory: memory
  });

  checkWarnings([], "init of loader does not trigger warnings");
  
  loader.require("foo");
  checkWarnings([], "require() of non-chrome module w/ expected deps works");

  loader.require("sorta-bad");
  checkWarnings(["undeclared require(foo) called from sorta-bad"],
                "require() of non-chrome module w/ unexpected " +
                "non-chrome dep triggers warning");

  loader.require("pure-evil");
  checkWarnings(["undeclared require(chrome) called from pure-evil"],
                "require() of non-chrome modulue w/ unexpected " +
                "chrome dep triggers warning");

  test.pass("OK");
}
