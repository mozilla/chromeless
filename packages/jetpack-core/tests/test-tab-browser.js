/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is Mozilla.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var timer = require("timer");
var {Cc,Ci} = require("chrome");

// Utility function to open a new browser window.
// Currently does not work if there's not already a browser
// window open.
function openBrowserWindow(callback, url) {
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);
  let win = wm.getMostRecentWindow("navigator:browser");
  let window = win.openDialog("chrome://browser/content/browser.xul",
                              "_blank", "chrome,all,dialog=no", url); 
  if (callback) {
    function onLoad(event) {
      if (event.target && event.target.defaultView == window) {
        window.removeEventListener("load", onLoad, true);
        let browsers = window.document.getElementsByTagName("tabbrowser");
        try {
          require("timer").setTimeout(function () {
            callback(window, browsers[0]);
          }, 10);
        } catch (e) { console.exception(e); }
      }
    }

    window.addEventListener("load", onLoad, true);
  }

  return window;
}

// Helper for calling code at window close
function closeBrowserWindow(window, callback) {
  require("timer").setTimeout(function() {
    window.addEventListener("unload", function() {
      window.removeEventListener("unload", arguments.callee, false);
      callback();
    }, false);
    window.close();
  }, 0);
}

exports.testAddTab = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    const tabBrowser = require("tab-browser");

    let cache = [];
    let windowUtils = require("window-utils");
    new windowUtils.WindowTracker({
      onTrack: function(win) {
        cache.push(win);
      },
      onUntrack: function(win) {
        cache.splice(cache.indexOf(win), 1)
      }
    });
    let startWindowCount = cache.length;

    // Test 1: add a tab
    let firstUrl = "data:text/html,one";
    tabBrowser.addTab(firstUrl, {
      onLoad: function(e) {
        let win1 = cache[startWindowCount - 1];
        test.assertEqual(win1.content.location, firstUrl, "URL of new tab in first window matches");

        // Test 2: add a tab in a new window
        let secondUrl = "data:text/html,two";
        tabBrowser.addTab(secondUrl, {
          inNewWindow: true,
          onLoad: function(e) {
            test.assertEqual(cache.length, startWindowCount + 1, "a new window was opened");
            let win2 = cache[startWindowCount];
            let gBrowser = win2.gBrowser;
            gBrowser.addEventListener("DOMContentLoaded", function(e) {
              gBrowser.removeEventListener("DOMContentLoaded", arguments.callee, false);
              test.assertEqual(win2.content.location, secondUrl, "URL of new tab in the new window matches");

              closeBrowserWindow(win2, function() {
                closeBrowserWindow(win1, function() {
                  test.done();
                });
              });
            }, false);
          }
        });
      }
    });
  });
};

exports.testTrackerWithDelegate = function(test) {
  test.waitUntilDone();
  const tabBrowser = require("tab-browser");

  var delegate = {
    state: "initializing",
    onTrack: function onTrack(browser) {
      if (this.state == "initializing") {
        this.state = "waiting for browser window to open";
      }
      else if (this.state == "waiting for browser window to open") {
        this.state = "waiting for browser window to close";
        require("timer").setTimeout(function() {
          closeBrowserWindow(browser.ownerDocument.defaultView, function() {
            test.assertEqual(delegate.state, "deinitializing");
            tb.unload();
            test.done();
          });
        }, 0);
      }
      else
        test.fail("invalid state");
    },
    onUntrack: function onUntrack(browser) {
      if (this.state == "waiting for browser window to close") {
        test.pass("proper state in onUntrack");
        this.state = "deinitializing";
      }
      else if (this.state != "deinitializing")
        test.fail("invalid state");
    }
  };
  var tb = new tabBrowser.Tracker(delegate);

  delegate.state = "waiting for browser window to open";

  openBrowserWindow();
};

exports.testWhenContentLoaded = function(test) {
  test.waitUntilDone();
  const tabBrowser = require("tab-browser");

  var tracker = tabBrowser.whenContentLoaded(
    function(window) {
      var item = window.document.getElementById("foo");
      test.assertEqual(item.textContent, "bar",
                       "whenContentLoaded() works.");
      tracker.unload();
      closeBrowserWindow(activeWindow, function() {
        test.done();
      });
    });

  openBrowserWindow(function(browserWindow, browser) {
    var html = '<div id="foo">bar</div>';
    browser.addTab("data:text/html," + html);
  });
};

exports.testTrackerWithoutDelegate = function(test) {
  test.waitUntilDone();
  const tabBrowser = require("tab-browser");

  openBrowserWindow(function(browserWindow, browser) {
    var tb = new tabBrowser.Tracker();

    if (tb.length == 0)
      test.fail("expect at least one tab browser to exist.");

    for (var i = 0; i < tb.length; i++)
      test.assertEqual(tb.get(i).nodeName, "tabbrowser",
                       "get() method and length prop should work");
    for (var b in tb)
      test.assertEqual(b.nodeName, "tabbrowser",
                       "iterator should work");

    var matches = [b for (b in tb)
                           if (b == browser)];
    test.assertEqual(matches.length, 1,
                     "New browser should be in tracker.");

    closeBrowserWindow(browserWindow, function() {
      tb.unload();
      test.done();
    });
  });
};

exports.testTabTracker = function(test) {
  test.waitUntilDone();
  const tabBrowser = require("tab-browser");

  openBrowserWindow(function(browserWindow, browser) {
    var delegate = {
      tracked: 0,
      onTrack: function(tab) {
        this.tracked++;
        if (this.tracked == 5)
          closeBrowserWindow(browserWindow);
      },
      onUntrack: function(tab) {
        this.tracked--;
        if (this.tracked == 1) {
          tabTracker.unload();
          test.done();
        }
      }
    };

    let tabTracker = tabBrowser.TabTracker(delegate);

    let tracked = delegate.tracked;
    let url1 = "data:text/html,1";
    tabBrowser.addTab(url1, {
      onLoad: function(e) {
        test.assertEqual(delegate.tracked, ++tracked, "first tab tracked matched count");
        test.assertEqual(url1, e.target.defaultView.location, "open() load listener matched URLs")
        tabBrowser.addTab("data:text/html,2");
        test.assertEqual(delegate.tracked, ++tracked, "second tab tracked matched count");
        tabBrowser.addTab("data:text/html,3");
        test.assertEqual(delegate.tracked, ++tracked, "third tab tracked matched count");
      }
    });
  });
};

exports.testActiveTab = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(browserWindow, browser) {
    const tabBrowser = require("tab-browser");
    let url = "data:text/html,foo";
    tabBrowser.addTab(url, {
      onLoad: function(e) {
        let tabIndex = browser.getBrowserIndexForDocument(e.target);
        test.assertEqual(browser.tabContainer.getItemAtIndex(tabIndex), tabBrowser.activeTab, "activeTab element matches");
        closeBrowserWindow(browserWindow, function() {
          test.done();
        });
      }
    });
  });
};

/******************* helpers *********************/

// Helper for getting the active window
this.__defineGetter__("activeWindow", function activeWindow() {
  return Cc["@mozilla.org/appshell/window-mediator;1"].
         getService(Ci.nsIWindowMediator).
         getMostRecentWindow("navigator:browser");
});

// If the module doesn't support the app we're being run in, require() will
// throw.  In that case, remove all tests above from exports, and add one dummy
// test that passes.
try {
  require("tab-browser");
}
catch (err) {
  // This bug should be mentioned in the error message.
  let bug = "https://bugzilla.mozilla.org/show_bug.cgi?id=560716";
  if (err.message.indexOf(bug) < 0)
    throw err;
  for (let [prop, val] in Iterator(exports)) {
    if (/^test/.test(prop) && typeof(val) === "function")
      delete exports[prop];
  }
  exports.testAppNotSupported = function (test) {
    test.pass("the tab-browser module does not support this application.");
  };
}
