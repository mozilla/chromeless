var xhr = require("xhr");
var timer = require("timer");

var gServices = {};

var manager = Components.manager;
manager.QueryInterface(Ci.nsIComponentRegistrar);

// TODO: Call this for all services in gServices on unload?
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

function runTask(options) {
  var harnessService;
  var contractID = options.bootstrap.contractID;
  var classID = Components.ID(options.bootstrap.classID);

  maybeUnload(contractID, classID);
  options.runImmediately = true;

  var HarnessService = packaging.buildHarnessService(packaging.root,
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

  processNextTask();
}

function processNextTask() {
  var req = new xhr.XMLHttpRequest();
  var url = "http://localhost:8888/api/task-queue/get";
  req.open("GET", url);
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      if (req.status == 200) {
        if (req.responseText) {
          runTask(JSON.parse(req.responseText));
        } else
          processNextTask();
      } else {
        timer.setTimeout(processNextTask, 1000);
      }
    }
  };
  req.send(null);
}

exports.main = function(options) {
  console.log("Starting.");
  processNextTask();
};
