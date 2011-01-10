var observers = require("observer-service");
var {Cc,Ci} = require("chrome");

exports.testUnloadAndErrorLogging = function(test) {
  var prints = [];
  function print(message) {
    prints.push(message);
  }
  var loader = test.makeSandboxedLoader({print: print});
  var sbobsvc = loader.require("observer-service");

  var timesCalled = 0;
  var cb = function(subject, data) {
    timesCalled++;
  };
  var badCb = function(subject, data) {
    throw new Error("foo");
  };
  sbobsvc.add("blarg", cb);
  observers.notify("blarg", "yo yo");
  test.assertEqual(timesCalled, 1);
  sbobsvc.add("narg", badCb);
  observers.notify("narg", "yo yo");
  var lines = prints[0].split("\n");
  test.assertEqual(lines[0], "error: An exception occurred.");
  test.assertEqual(lines[1], "Traceback (most recent call last):");
  test.assertEqual(lines.slice(-2)[0], "Error: foo");

  loader.unload();
  observers.notify("blarg", "yo yo");
  test.assertEqual(timesCalled, 1);
};

exports.testObserverService = function(test) {
  var ios = Cc['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
  var service = Cc["@mozilla.org/observer-service;1"].
                getService(Ci.nsIObserverService);
  var uri = ios.newURI("http://www.foo.com", null, null);
  var timesCalled = 0;
  var lastSubject = null;
  var lastData = null;

  var cb = function(subject, data) {
    timesCalled++;
    lastSubject = subject;
    lastData = data;
  };

  observers.add("blarg", cb);
  service.notifyObservers(uri, "blarg", "some data");
  test.assertEqual(timesCalled, 1,
                   "observer-service.add() should call callback");
  test.assertEqual(lastSubject, uri,
                   "observer-service.add() should pass subject");
  test.assertEqual(lastData, "some data",
                   "observer-service.add() should pass data");

  function customSubject() {}
  function customData() {}
  observers.notify("blarg", customSubject, customData);
  test.assertEqual(timesCalled, 2,
                   "observer-service.notify() should work");
  test.assertEqual(lastSubject, customSubject,
                   "observer-service.notify() should pass+wrap subject");
  test.assertEqual(lastData, customData,
                   "observer-service.notify() should pass data");

  observers.remove("blarg", cb);
  service.notifyObservers(null, "blarg", "some data");
  test.assertEqual(timesCalled, 2,
                   "observer-service.remove() should work");
};
