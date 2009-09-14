(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;

   var exports = new Object();

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
        sandboxFactory: new SecurableModule.SandboxFactory("system")
       });
     loader.runScript({contents: 'Components.classes'});
     log("modules should be able to have chrome privileges.", "pass");

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
       var localFs = new SecurableModule.LocalFileSystem(testDir);
       loader = new SecurableModule.Loader(
         {fs: localFs,
          globals: {sys: {print: log}}
         });
       loader.runScript({contents: 'require("program")'});
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
