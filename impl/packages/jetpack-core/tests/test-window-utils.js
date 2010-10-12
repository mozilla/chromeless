var windowUtils = require("window-utils");
var timer = require("timer");
var {Cc,Ci} = require("chrome");

function makeEmptyWindow() {
  var xulNs = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
  var blankXul = ('<?xml version="1.0"?>' +
                  '<?xml-stylesheet href="chrome://global/skin/" ' +
                  '                 type="text/css"?>' +
                  '<window xmlns="' + xulNs + '">' +
                  '</window>');
  var url = "data:application/vnd.mozilla.xul+xml," + escape(blankXul);
  var features = ["chrome", "width=10", "height=10"];

  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);
  return ww.openWindow(null, url, null, features.join(","), null);
}

exports.testCloseOnUnload = function(test) {
  var timesClosed = 0;
  var fakeWindow = {
    _listeners: [],
    addEventListener: function(name, func, bool) {
      this._listeners.push(func);
    },
    removeEventListener: function(name, func, bool) {
      var index = this._listeners.indexOf(func);
      if (index == -1)
        throw new Error("event listener not found");
      this._listeners.splice(index, 1);
    },
    close: function() {
      timesClosed++;
      this._listeners.forEach(
        function(func) { 
          func({target: fakeWindow.document});
        });
    },
    document: {
      get defaultView() { return fakeWindow; }
    }
  };

  var loader = test.makeSandboxedLoader();
  loader.require("window-utils").closeOnUnload(fakeWindow);
  test.assertEqual(fakeWindow._listeners.length, 1,
                   "unload listener added on closeOnUnload()");
  test.assertEqual(timesClosed, 0,
                   "window not closed when registered.");
  loader.require("unload").send();
  test.assertEqual(timesClosed, 1,
                   "window closed on module unload.");
  test.assertEqual(fakeWindow._listeners.length, 0,
                   "unload event listener removed on module unload");

  timesClosed = 0;
  loader.require("window-utils").closeOnUnload(fakeWindow);
  test.assertEqual(timesClosed, 0,
                   "window not closed when registered.");
  fakeWindow.close();
  test.assertEqual(timesClosed, 1,
                   "window closed when close() called.");
  test.assertEqual(fakeWindow._listeners.length, 0,
                   "unload event listener removed on window close");
  loader.require("unload").send();
  test.assertEqual(timesClosed, 1,
                   "window not closed again on module unload.");
  loader.unload();  
};

exports.testWindowWatcher = function(test) {
  var myWindow;
  var finished = false;

  var delegate = {
    onTrack: function(window) {
      if (window == myWindow) {
        test.pass("onTrack() called with our test window");
        timer.setTimeout(function() { myWindow.close(); }, 1);
      }
    },
    onUntrack: function(window) {
      if (window == myWindow) {
        test.pass("onUntrack() called with our test window");
        timer.setTimeout(function() {
                           if (!finished) {
                             finished = true;
                             myWindow = null;
                             wt.unload();
                             test.done();
                           } else
                             test.fail("finishTest() called multiple times.");
                         }, 1);
      }
    }
  };

  var wt = new windowUtils.WindowTracker(delegate);
  myWindow = makeEmptyWindow();
  test.waitUntilDone(5000);
};

exports.testActiveWindow = function(test) {
  test.waitUntilDone(5000);

  let testRunnerWindow = Cc["@mozilla.org/appshell/window-mediator;1"]
                         .getService(Ci.nsIWindowMediator)
                         .getMostRecentWindow(null);
  let browserWindow =  Cc["@mozilla.org/appshell/window-mediator;1"]
                      .getService(Ci.nsIWindowMediator)
                      .getMostRecentWindow("navigator:browser");

  test.assertEqual(windowUtils.activeWindow, testRunnerWindow,
                    "Test runner is the active window.");

  test.assertEqual(windowUtils.activeBrowserWindow, browserWindow,
                    "Browser window is the active browser window.");


  let testSteps = [
    function() {
      windowUtils.activeWindow = browserWindow;
      continueAfterFocus(browserWindow);
    },
    function() {
      test.assertEqual(windowUtils.activeWindow, browserWindow,
                       "Correct active window [1]");
      windowUtils.activeWindow = testRunnerWindow;
      continueAfterFocus(testRunnerWindow);
    },
    function() {
      test.assertEqual(windowUtils.activeWindow, testRunnerWindow,
                       "Correct active window [2]");
      test.assertEqual(windowUtils.activeBrowserWindow, browserWindow,
                       "Correct active browser window [3]");
      windowUtils.activeWindow = browserWindow;
      continueAfterFocus(browserWindow);
    },
    function() {
      test.assertEqual(windowUtils.activeWindow, browserWindow,
                       "Correct active window [4]");
      windowUtils.activeWindow = testRunnerWindow;
      continueAfterFocus(testRunnerWindow);
    },
    function() {
      test.assertEqual(windowUtils.activeWindow, testRunnerWindow,
                       "Correct active window [5]");
      test.assertEqual(windowUtils.activeBrowserWindow, browserWindow,
                       "Correct active browser window [6]");
      testRunnerWindow = null;
      browserWindow = null;
      test.done()
    }
  ];

  let nextTest = function() {
    let func = testSteps.shift();
    if (func) {
      func();
    }
  }

  function continueAfterFocus(targetWindow) {

    // Based on SimpleTest.waitForFocus
    var fm = Cc["@mozilla.org/focus-manager;1"].
             getService(Ci.nsIFocusManager);

    var childTargetWindow = {};
    fm.getFocusedElementForWindow(targetWindow, true, childTargetWindow);
    childTargetWindow = childTargetWindow.value;

    var focusedChildWindow = {};
    if (fm.activeWindow) {
      fm.getFocusedElementForWindow(fm.activeWindow, true, focusedChildWindow);
      focusedChildWindow = focusedChildWindow.value;
    }

    var focused = (focusedChildWindow == childTargetWindow);
    if (focused) {
      nextTest();
    } else {
      childTargetWindow.addEventListener("focus", function focusListener() {
        childTargetWindow.removeEventListener("focus", focusListener, true);
        nextTest();
      }, true);
    }

  }

  nextTest();
}
