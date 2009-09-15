(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;

   var exports = new Object();

   var ios = Cc['@mozilla.org/network/io-service;1']
             .getService(Ci.nsIIOService);

   exports.run = function run(SecurableModule, log, rootDir) {
     // Test micro-framework functions.
     function assertEqual(a, b) {
       var op = "!=";
       var label = "fail";
       if (a == b) {
         op = "==";
         label = "pass";
       }
       var message = uneval(a) + op + uneval(b);
       log(message, label);
     }

     // Basic test of module loading with a fake fs.
     var output = [];
     var loader = new SecurableModule.Loader(
       {fs: {
          resolveModule: function(root, path) {
            return path;
          },
          getFile: function(path) {
            return {contents: ('print("hi from ' + path + '");' +
                               ' exports.beets = 5;')};
          }
        },
        globals: {print: function(msg) { output.push(msg); }}
       });
     loader.runScript({contents: 'print("beets is " + ' +
                       'require("beets").beets);'});
     assertEqual(output[0], 'hi from beets');
     assertEqual(output[1], 'beets is 5');

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
       assertEqual(e.message, 'Module "foo" not found');
     }

     loader = new SecurableModule.Loader({fs: {}});
     try {
       loader.runScript({contents: 'Components.classes'});
       log("modules shouldn't have chrome privileges by default.",
           "fail");
     } catch (e) {
       assertEqual(
         e.message,
         ("Permission denied for <http://www.mozilla.org> " +
          "to get property XPCComponents.classes")
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
     assertEqual(fs._rootURIDir, ios.newFileURI(rootDir).spec);
     var someFile = rootDir.clone();
     someFile.append("nonexistent");
     fs = new SecurableModule.LocalFileSystem(someFile);
     assertEqual(fs._rootURIDir, ios.newFileURI(rootDir).spec);
     someFile = rootDir.clone();
     someFile.append("monkeys");
     fs = new SecurableModule.LocalFileSystem(someFile);
     assertEqual(fs._rootURIDir, ios.newFileURI(someFile).spec);

     if (SecurableModule.baseURI) {
       // Note that a '/' must be put after the directory name.
       var newURI = ios.newURI('lib/', null, SecurableModule.baseURI);
       fs = new SecurableModule.LocalFileSystem(newURI);
       assertEqual(fs._rootURIDir, newURI.spec);
       loader = new SecurableModule.Loader();
       assertEqual(loader._fs._rootURI.spec, SecurableModule.baseURI.spec);
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
