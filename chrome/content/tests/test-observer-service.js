exports.testObserverService = function(test) {
  var ios = Cc['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
  var service = Cc["@mozilla.org/observer-service;1"].
                getService(Ci.nsIObserverService);
  var observers = require("observer-service");
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
