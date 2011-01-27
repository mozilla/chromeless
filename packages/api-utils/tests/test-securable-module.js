const {Cc,Ci,Cu} = require("chrome");

const COMPONENTS_DOT_CLASSES = "Com" + "ponents.classes";

var beetFs = {
  resolveModule: function(root, path) {
    if (path == "beets")
      return path;
  },
  getFile: function(path) {
    return {contents: ('print("hi from ' + path + '");' +
                       ' exports.beets = 5;')};
  }
};

(function(global) {
   var exports = new Object();

   var ios = Cc['@mozilla.org/network/io-service;1']
             .getService(Ci.nsIIOService);

   exports.testSecurableModule = function(test) {
     // The tests in this file weren't originally written for
     // Cuddlefish. This function is essentially an adapter
     // that runs the tests using the Cuddlefish testing
     // framework.
     function log(msg, type) {
       switch (type) {
       case "fail":
         test.fail(msg);
         break;
       case "pass":
         test.pass(msg);
         break;
       case "info":
         console.info(msg);
       }
     }
     var assert = {
       pass: function(msg) {
         test.pass(msg);
       },
       isEqual: function(a, b, msg) {
         test.assertEqual(a, b, msg);
       }
     };

     var url = require("url");
     var path = url.URL("interoperablejs-read-only/compliance/",
                        __url__).toString();
     path = url.toFilename(path);

     var file = Cc['@mozilla.org/file/local;1']
                .createInstance(Ci.nsILocalFile);
     file.initWithPath(path);

     run(require("securable-module"),
         log,
         assert,
         file);
   };

   function run(SecurableModule, log, assert, rootDir) {
     // Basic test of module loading with a fake fs.
     var output = [];

     function outPrint(msg) { output.push(msg); }

     var loader = new SecurableModule.Loader({fs: beetFs,
                                              globals: {print: outPrint}});
     var extraOutput = {};
     loader.runScript({contents: 'print("beets is " + ' +
                       'require("beets").beets);'}, extraOutput);
     assert.isEqual(output[0], 'hi from beets', 'module should load');
     assert.isEqual(output[1], 'beets is 5', 'module should export');
     var printSrc = extraOutput.sandbox.getProperty('print');
     if (printSrc == "function outPrint() {\n    [native code]\n}")
       assert.pass('extraOutput.sandbox should work');
     else
       assert.isEqual(printSrc,
                      outPrint,
                      'extraOutput.sandbox should work');

     var neatFs = {
       resolveModule: function(root, path) {
         if (path == "neat")
           return path;
       },
       getFile: function(path) {
         return {contents: ('require("beets");' +
                            'print("hi from ' + path + '");' +
                            'exports.neat = "yo";')};
       }
     };

     loader = new SecurableModule.Loader(
       {fs: new SecurableModule.CompositeFileSystem([beetFs, neatFs]),
        globals: {print: outPrint}
       });
     output = [];
     loader.runScript({contents: 'print("neat is " + ' +
                       'require("neat").neat);'});
     assert.isEqual(output[0], 'hi from beets',
                    'submodule from composite fs should load');
     assert.isEqual(output[1], 'hi from neat',
                    'module from composite fs should load');
     assert.isEqual(output[2], 'neat is yo',
                    'module from composite fs should export');

     // Ensure parenting of anonymous script filenames works.
     loader = new SecurableModule.Loader({fs: {}});
     try {
       loader.runScript('throw new Error();');
       log("errors must be propogated from content sandboxes", "fail");
     } catch (e) {
       assert.isEqual(e.fileName, '<string>',
                      ('anonymous scripts w/o chrome privs should be ' +
                       'unparented'));
     }

     loader = new SecurableModule.Loader({fs: {},
                                          defaultPrincipal: "system"});
     try {
       loader.runScript('throw new Error();');
       log("errors must be propogated from chrome sandboxes", "fail");
     } catch (e) {
       assert.isEqual(e.fileName.slice(-11), '-> <string>',
                      ('anonymous scripts w/ chrome privs should be ' +
                       'parented'));
     }

     // Ensure loading nonexistent modules raises an error.
     loader = new SecurableModule.Loader(
       {fs: {
          resolveModule: function() { return null; },
          getFile: function(path) {
            throw new Error('I should never get called.');
          }
        }
       });
     try {
       loader.runScript({contents: 'require("foo");'});
       log("loading of nonexistent module did not raise exception",
           "fail");
     } catch (e) {
       assert.isEqual(e.message, 'Module "foo" not found',
                      'loading of nonexistent module should raise error');
     }

     loader = new SecurableModule.Loader({fs: {}});
     try {
       loader.runScript({contents: COMPONENTS_DOT_CLASSES});
       log("modules shouldn't have chrome privileges by default.",
           "fail");
     } catch (e) {
       // The error message that gets thrown is localized, so we must compare
       // it to the localized version.  This should be as simple as retrieving
       // that version from its string bundle, but the error message is also
       // corrupted (its characters' high bytes thrown away due to bug 567597),
       // so we have to do the same to the version to which we compare it.
       let bundle =
         require("app-strings").
         StringBundle("chrome://global/locale/security/caps.properties");
       let message = bundle.get("GetPropertyDeniedOriginsOnlySubject",
                                ["http://www.mozilla.org", "XPCComponents",
                                 "classes"]).
                     split("").
                     map(function(v) v.charCodeAt(0)).
                     map(function(v) v % 256).
                     map(function(v) String.fromCharCode(v)).
                     join("");

       assert.isEqual(e.message, message,
                      "modules shouldn't have chrome privileges by default.");
     }

     loader = new SecurableModule.Loader(
       {fs: {},
        defaultPrincipal: "system"
       });
     loader.runScript({contents: COMPONENTS_DOT_CLASSES});
     log("modules should be able to have chrome privileges.", "pass");

     // Test the way LocalFileSystem infers root directories.
     var fs = new SecurableModule.LocalFileSystem(rootDir);
     assert.isEqual(fs._rootURIDir, ios.newFileURI(rootDir).spec,
                    "fs rootdir should be same as passed-in dir");

     var someFile = rootDir.clone();
     someFile.append("ORACLE");
     fs = new SecurableModule.LocalFileSystem(someFile);
     assert.isEqual(fs._rootURIDir, ios.newFileURI(rootDir).spec,
                    "fs rootdir sould be dirname of file");

     someFile = rootDir.clone();
     someFile.append("monkeys");
     fs = new SecurableModule.LocalFileSystem(someFile);
     assert.isEqual(fs._rootURIDir, ios.newFileURI(someFile).spec,
                    "fs rootdir should be same as passed-in subdir");

     if (SecurableModule.baseURI) {
       // Note that a '/' must be put after the directory name.
       var newURI = ios.newURI('lib/', null, SecurableModule.baseURI);
       fs = new SecurableModule.LocalFileSystem(newURI);
       assert.isEqual(fs._rootURIDir, newURI.spec,
                      "fs rootdir should be subdir of document's dir");

       loader = new SecurableModule.Loader();
       assert.isEqual(loader._fs._rootURI.spec, SecurableModule.baseURI.spec,
                      "fs rootdir should be document's dir");
     } else {
       try {
         loader = new SecurableModule.Loader();
         log("Loader() w/ no params in a non-document context should " +
             "raise an exception.", "fail");
       } catch (e if e.message == "Need a root path for module filesystem") {
         log("Loader() w/ no params in a non-document context should " +
             "raise an exception.", "pass");
       }
     }

     // Run all CommonJS SecurableModule compliance tests.
     var testDirs = [];
     var enumer = rootDir.directoryEntries;
     while (enumer.hasMoreElements()) {
       var testDir = enumer.getNext().QueryInterface(Ci.nsIFile);
       if (testDir.isDirectory() &&
           testDir.leafName.charAt(0) != '.')
         testDirs.push(testDir);
     }

     for (var i = 0; i < testDirs.length; i++) {
       var testDir = testDirs[i];
       log("running compliance test '" + testDir.leafName + "'", "info");
       loader = new SecurableModule.Loader(
         {rootPath: testDir,
          defaultPrincipal: "system",
          globals: {sys: {print: log}}
         });
       loader.require("program");
     }

    // Confirm callback-based require works from an instantiated loader.
    // want to be back in api-utils/tests directory instead of
    // what rootDir is now:
    // api-utils/tests/interoperablejs-read-only/compliance/
    var moduleDir = rootDir.parent.parent;
    moduleDir.append("modules"),
    loader = new SecurableModule.Loader(
         {rootPath: moduleDir,
          defaultPrincipal: "system",
          globals: {sys: {print: log}}
         });

    loader.require(["subtract"], function (subtract) {
      assert.isEqual(2, subtract(3, 1),
                      "subtract module works with callback-style require");
    });

   };

   if (global.window) {
     // We're being loaded in a chrome window, or a web page with
     // UniversalXPConnect privileges.
     global.SecurableModuleTests = exports;
   } else if (global.exports) {
     // We're being loaded in a SecurableModule.
     for (name in exports) {
       global.exports[name] = exports[name];
     }
   } else {
     // We're being loaded in a JS module.
     global.EXPORTED_SYMBOLS = [];
     for (name in exports) {
       global.EXPORTED_SYMBOLS.push(name);
       global[name] = exports[name];
     }
   }
 })(this);

exports.testFindSandboxForModule = function(test) {
  var fs = {
    resolveModule: function(base, path) {
      test.assertEqual(base, null);
      test.assertEqual(path, "foo");
      return "/blarg/foo";
    },
    getFile: function(path) {
      test.assertEqual(path, "/blarg/foo");
      return {contents: "var baz = 1;"};
    }
  };

  var sm = require("securable-module");
  var loader = new sm.Loader({fs: fs});
  var sandbox = loader.findSandboxForModule("foo");
  test.assertEqual(sandbox.globalScope.baz, 1);
};

exports.testUtf8 = function (test) {
  // This test ensures that the securable module loader assumes files are
  // UTF-8-encoded and therefore decodes them properly when it reads them.
  var str = "文字";

  // Read this file into readStr, decoding from UTF-8.
  var filename = require("url").toFilename(__url__);
  var readStr = require("file").read(filename);

  // If str is not in readStr, then str and therefore this file were not decoded
  // from UTF-8 by the loader.
  test.assert(readStr.indexOf(str) >= 0, "Loader should treat files as UTF-8");
};

exports.testGetModuleExports = function (test) {
  var sm = require("securable-module");

  function myGetModuleExports(basePath, module) {
    if (module == "foo")
      return {bar: 1};
    return null;
  }

  var loader = new sm.Loader({getModuleExports: myGetModuleExports,
                              fs: beetFs,
                              globals: {print: function() {}}});

  test.assertEqual(loader.require("foo").bar, 1,
                   "getModuleExports() works");
  test.assertEqual(loader.require("beets").beets, 5,
                   "loader falls through to fs when getModuleExports() " +
                   "returns null");
};

exports.testModifyModuleSandbox = function (test) {
  var sm = require("securable-module");
  var out;

  function modifyModuleSandbox(sandbox, options) {
    sandbox.defineProperty("print", function() { out = options.contents; });
  }

  var loader = new sm.Loader({modifyModuleSandbox: modifyModuleSandbox,
                              globals: {print: function() {}},
                              fs: beetFs});

  loader.require("beets");
  test.assertEqual(out,
                   "print(\"hi from beets\"); exports.beets = 5;",
                   "testModifyModuleSandbox() mods override globals");
};

exports.testSecurityPolicy = function (test) {
  var sm = require("securable-module");
  var lines = [];
  var expectedLines = [];
  var allowImport = false;
  var allowEval = false;

  var secpol = {
    allowImport: function(loader, basePath, module, module_info, exports) {
      if (loader != this.expectLoader)
        test.fail("loader != this.expectLoader");
      if (module == "beets" && exports.beets != 5)
        test.fail("exports passed to maybeBlockImport are not valid");
      if (!allowImport)
        return false;
      lines.push('allowing import of ' + module + ' from ' +
                 basePath);
      return true;
    },
    allowEval: function(loader, basePath, module, module_info) {
      if (loader != this.expectLoader)
        test.fail("loader != this.expectLoader");
      if (!allowEval)
        return false;
      lines.push('allowing eval of ' + module_info.contents.length +
                 ' chars for module ' + module + ' from ' + basePath);
      return true;
    }
  };

  function myGetModuleExports(basePath, module) {
    if (module == "foo")
      return {bar: 1};
    return null;
  }

  var loader = new sm.Loader({getModuleExports: myGetModuleExports,
                              fs: beetFs,
                              securityPolicy: secpol,
                              globals: {print: function() {}}});
  secpol.expectLoader = loader;

  test.assertRaises(function() { loader.require('beets'); },
                    /access denied to execute module: beets/);
  test.assertRaises(function() { loader.require('foo'); },
                    /access denied to import module: foo/);

  allowEval = true;

  test.assertEqual(lines.length, 0);
  expectedLines = ["allowing eval of 42 chars for module beets from null"];
  test.assertRaises(function() { loader.require('beets'); },
                    /access denied to import module: beets/);
  test.assertEqual(JSON.stringify(lines), JSON.stringify(expectedLines));

  allowImport = true;

  lines = [];
  expectedLines = ["allowing import of beets from null"];
  if (loader.require('beets').beets != 5)
    test.fail("require() does not work as expected.");
  test.assertEqual(JSON.stringify(lines), JSON.stringify(expectedLines));

  lines = [];
  expectedLines = ["allowing import of foo from null"];
  if (loader.require('foo').bar != 1)
    test.fail("require() does not work as expected.");
  test.assertEqual(JSON.stringify(lines), JSON.stringify(expectedLines));
};
