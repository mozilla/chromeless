(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;

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
       isEqual: function(a, b, msg) {
         test.assertEqual(a, b, msg);
       }
     };

     var url = require("url");
     var path = url.resolve(__url__,
                            "interoperablejs-read-only/compliance/");
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

     var loader = new SecurableModule.Loader({fs: beetFs,
                                              globals: {print: outPrint}});
     var extraOutput = {};
     loader.runScript({contents: 'print("beets is " + ' +
                       'require("beets").beets);'}, extraOutput);
     assert.isEqual(output[0], 'hi from beets', 'module should load');
     assert.isEqual(output[1], 'beets is 5', 'module should export');
     assert.isEqual(extraOutput.sandbox.getProperty('print'),
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
       loader.runScript({contents: 'Components.classes'});
       log("modules shouldn't have chrome privileges by default.",
           "fail");
     } catch (e) {
       assert.isEqual(
         e.message,
         ("Permission denied for <http://www.mozilla.org> " +
          "to get property XPCComponents.classes"),
         "modules shouldn't have chrome privileges by default."
       );
     }

     loader = new SecurableModule.Loader(
       {fs: {},
        defaultPrincipal: "system"
       });
     loader.runScript({contents: 'Components.classes'});
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
          globals: {sys: {print: log}}
         });
       loader.require("program");
     }
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
