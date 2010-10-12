var tabBrowser = require("tab-browser");
var timer = require("timer");

// Arbitrary delay needed to avoid weird behavior.
// TODO: We need to find all uses of this and replace them
// with more deterministic solutions.
var ARB_DELAY = 100;

function openBrowserWindow(callback) {
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);
  var features = ["chrome"];
  var window = ww.openWindow(null, "chrome://browser/content/browser.xul",
                             null, features.join(","), null);

  if (callback) {
    function onLoad(event) {
      if (event.target && event.target.defaultView == window) {
        window.removeEventListener("load", onLoad, true);
        var browsers = window.document.getElementsByTagName("tabbrowser");
        try {
          callback(window, browsers[0]);
        } catch (e) { console.exception(e); }
      }
    }

    window.addEventListener("load", onLoad, true);
  }

  return window;
}

exports.testAddTab = function(test) {
  if (!tabBrowser.isAppSupported())
    return;

  var firstUrl = "data:text/html,one";
  var secondUrl = "data:text/html,two";

  openBrowserWindow(
    function(firstWindow, browser) {
      var browsers = new tabBrowser.Tracker();
      var browsersAtStart = browsers.length;
      var state = "waiting for first tab";

      var contentLoader = tabBrowser.whenContentLoaded(
        function(window) {
          if (window.location == firstUrl &&
              state == "waiting for first tab") {
            test.assertEqual(browsers.length,
                             browsersAtStart,
                             "no new window should be opened");
            test.pass("calling w/ no options opens tab");
            // No need to close the window, as we close
            // the browser it's in later.
            state = "waiting for second tab";
            tabBrowser.addTab(secondUrl, {inNewWindow: true});
          } else if (window.location == secondUrl &&
                     state == "waiting for second tab") {
            test.assertEqual(browsers.length,
                             browsersAtStart+1,
                             "inNewWindow should open new window");
            test.pass("calling w/ inNewWindow opens tab");
            window.close();
            firstWindow.close();
            state = "done";
            timer.setTimeout(function() {
                               browsers.unload();
                               contentLoader.unload();
                               test.done();
                             }, ARB_DELAY);
          } else
            test.fail("unexpected window/state: " + window.location +
                      " / " + state);
        });
      tabBrowser.addTab(firstUrl);
    });

  test.waitUntilDone(5000);
};

exports.testTrackerWithDelegate = function(test) {
  if (!tabBrowser.isAppSupported())
    return;

  var delegate = {
    state: "initializing",
    onTrack: function onTrack(browser) {
      if (this.state == "waiting for browser window to open") {
        this.state = "waiting for browser window to close";
        test.pass("Tracker detects new browser windows");
        timer.setTimeout(function() { window.close(); },
                         ARB_DELAY);
      } else {
        if (this.state != "initializing")
          test.fail("bad state: " + this.state);
      }
    },
    onUntrack: function onUntrack(browser) {
      if (this.state == "waiting for browser window to close") {
        this.state = "deinitializing";
        timer.setTimeout(function() { tb.unload(); test.done(); }, 1);
      } else {
        if (this.state != "deinitializing")
          test.fail("bad state: " + this.state);
      }
    }
  };
  var tb = new tabBrowser.Tracker(delegate);

  delegate.state = "waiting for browser window to open";

  var window = openBrowserWindow();

  test.waitUntilDone(5000);
};

exports.testWhenContentLoaded = function(test) {
  if (!tabBrowser.isAppSupported())
    return;

  var tracker = tabBrowser.whenContentLoaded(
    function(window) {
      var item = window.document.getElementById("foo");
      test.assertEqual(item.textContent, "bar",
                       "whenContentLoaded() works.");
      browserWindow.close();
      timer.setTimeout(function() { tracker.unload();
                                    test.done(); },
                       ARB_DELAY);
    });

  var browserWindow = openBrowserWindow(
    function(window, browser) {
      var html = '<div id="foo">bar</div>';
      browser.addTab("data:text/html," + html);
    });

  test.waitUntilDone(5000);
};

exports.testTrackerWithoutDelegate = function(test) {
  if (!tabBrowser.isAppSupported())
    return;

  openBrowserWindow(
    function(window, newBrowser) {
      var tb = new tabBrowser.Tracker();

      if (tb.length == 0)
        test.fail("expect at least one tab browser to exist.");

      for (var i = 0; i < tb.length; i++)
        test.assertEqual(tb.get(i).nodeName, "tabbrowser",
                         "get() method and length prop should work");
      for (var browser in tb)
        test.assertEqual(browser.nodeName, "tabbrowser",
                         "iterator should work");

      var matches = [browser for (browser in tb)
                             if (browser == newBrowser)];
      test.assertEqual(matches.length, 1,
                       "New browser should be in tracker.");

      timer.setTimeout(function() {
                         window.close();
                         tb.unload();
                         test.done();
                       }, ARB_DELAY);
    });

  test.waitUntilDone(5000);
};
