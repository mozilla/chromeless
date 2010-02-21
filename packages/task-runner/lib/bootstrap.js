var file = require("file");

var gServices = {};

var manager = Components.manager;
manager.QueryInterface(Ci.nsIComponentRegistrar);

function maybeUnload(contractID, classID) {
  if (contractID in gServices) {
    console.log("unloading", contractID);
    try {
      gServices[contractID].unload();
    } catch (e) {
      console.exception(e);
    }
    delete gServices[contractID];
    maybeUnregister(contractID, classID);
  }
}

function maybeUnregister(contractID, classID) {
  try {
    var factory = manager.getClassObjectByContractID(contractID,
                                                     Ci.nsIFactory);
    manager.unregisterFactory(classID, factory);
  } catch (e) {
    console.exception(e);
  }
}

function makeQuit(contractID, classID) {
  return function quit(status) {
    console.log("TASK: quit", status);
    maybeUnload(contractID, classID);
    console.log("Done.");
  };
}

function logError(e) {
  console.exception(e);
}

exports.run = function run(options, rootDirPath) {
  var harnessService;
  var contractID = options.bootstrap.contractID;
  var classID = Components.ID(options.bootstrap.classID);

  maybeUnload(contractID, classID);
  options.runImmediately = true;

  var rootDir = Cc["@mozilla.org/file/local;1"]
                .createInstance(Ci.nsILocalFile);
  rootDir.initWithPath(rootDirPath);

  var HarnessService = packaging.buildHarnessService(rootDir,
                                                     dump,
                                                     logError,
                                                     makeQuit(contractID,
                                                              classID),
                                                     options);
  var factory = HarnessService.prototype._xpcom_factory;
  var proto = HarnessService.prototype;
  manager.registerFactory(proto.classID,
                          proto.classDescription,
                          proto.contractID,
                          factory);
  console.log("Registered factory.");

  try {
    harnessService = factory.createInstance(null, Ci.nsISupports);
    harnessService = harnessService.wrappedJSObject;
    gServices[contractID] = harnessService;
    harnessService.load();
  } catch (e) {
    console.exception(e);
  }
}

require("unload").when(
  function() {
    var argLists = [];
    for (contractID in gServices)
      argLists.push([contractID, gServices[contractID].classID]);

    argLists.forEach(
      function(args) {
        maybeUnload.apply(undefined, args);
      });
  });
