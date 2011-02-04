const {Cc, Ci, Cu} = require("chrome"),
      env = Cc["@mozilla.org/process/environment;1"]
            .getService(Ci.nsIEnvironment),
      runtime = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);

exports.__defineGetter__("argv", function() {
    var args = env.get("CHROMELESS_CMD_ARGS");
    return args ? args.split(" ") : [];
});

exports.__defineGetter__("os", function() {
    return runtime.OS.toLowerCase();
});

exports.exit = function exit(code) {
  let appStartup = Cc["@mozilla.org/toolkit/app-startup;1"]
                   .getService(Ci.nsIAppStartup);
  appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
  //or Ci.nsIAppStartup.eForceQuit for a brutal force quit.
};

exports.cwd = function cwd() {
  return Cc["@mozilla.org/file/directory_service;1"]
         .getService(Ci.nsIDirectoryServiceProvider)
         .getFile("CurWorkD",{}).path;
};
