const Cc = Components.classes;
const Ci = Components.interfaces;

function quit() {
  var appStartup = Cc['@mozilla.org/toolkit/app-startup;1'].
                   getService(Ci.nsIAppStartup);

  appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
}

window.addEventListener(
  "load",
  function() {
    var SecurableModules = {};
    try {
      Components.utils.import("resource://jetpack/modules/booster.js",
                              SecurableModules);
      var loader = new SecurableModules.Loader(
        {fs: {
           resolveModule: function(root, path) {
             return path;
           },
           getFile: function(path) {
             return {contents: 'dump("hi from ' + path + '\\n"); exports.beets = 5;'};
           }
         }
        });
      loader.runScript({contents: 'dump("beets is " + require("beets").beets + "\\n");'});
    } catch (e) {
      dump("Exception: " + e + " (" + e.fileName +
           ":" + e.lineNumber + ")\n");
    }
    quit();
  },
  false
);
