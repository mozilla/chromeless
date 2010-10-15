var cw = require("content-window");

exports.testContentWindow = function(test) {
  var cService = Cc['@mozilla.org/consoleservice;1'].getService()
                 .QueryInterface(Ci.nsIConsoleService);

  var messagesLogged = 0;
  var consoleListener = {
    observe: function(object) {
      messagesLogged++;
    }
  };

  function toStringMe() {
    // This global should be injected by chrome code.
    foo++;

    // If we have support for ChromeObjectWrappers (COWs), then
    // we should have an object injected.
    if ('injected' in window)
      injected.bar();
  }

  var html = ('<p id="hi">hi</p>' +
              '<script>(' + toStringMe.toString() +
              ')();</script>');
  var window;
  var cowSupport = false;
  var wasInjectedCalled = false;

  var injected = {
    __exposedProps__: {bar: "r"},

    bar: function() {
      wasInjectedCalled = true;
    }
  };

  function onReady(event) {
    test.assertEqual(messagesLogged, 0,
                     "No console messages logged during load");
    cService.unregisterListener(consoleListener);

    test.assertEqual(this.wrappedJSObject.foo, 55,
                     "onStartLoad() is called before scripts run");
    if (cowSupport)
      test.assertEqual(wasInjectedCalled, true);

    var elem = event.target.getElementById("hi");
    test.assertEqual(elem.textContent, "hi",
                     "DOM is accessible and correct");
    window.close();
    test.done();
  }

  var options = {
    width: 100,
    height: 100,
    onStartLoad: function(window) {
      window.wrappedJSObject.foo = 54;

      var test_utils = window.QueryInterface(Ci.nsIInterfaceRequestor)
                       .getInterface(Ci.nsIDOMWindowUtils);

      if (test_utils.getCOWForObject) {
        cowSupport = true;
        window.wrappedJSObject.injected = test_utils.getCOWForObject(
          window,
          injected
        );
      }

      window.addEventListener("DOMContentLoaded", onReady, false);
    },
    url: "data:text/html," + escape(html)
  };

  cService.registerListener(consoleListener);
  window = new cw.Window(options);
  test.waitUntilDone(10000);
};
