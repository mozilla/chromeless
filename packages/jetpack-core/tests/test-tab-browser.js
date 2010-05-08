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

var tests = {};

tests.testAddTab = function(test) {
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

tests.testTrackerWithDelegate = function(test) {
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

tests.testWhenContentLoaded = function(test) {
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

tests.testTrackerWithoutDelegate = function(test) {
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

if (tabBrowser.isAppSupported())
  for (let name in tests)
    exports[name] = tests[name];
