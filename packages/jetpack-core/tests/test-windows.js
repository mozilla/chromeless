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
 *   Felipe Gomes <felipc@gmail.com> (Original author)
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

const {Cc, Ci} = require("chrome");

exports.testOpenAndCloseWindow = function(test) {
  test.waitUntilDone();
  let windows = require("windows").browserWindows;

  test.assertEqual(windows.length, 1, "Only one window open");

  windows.openWindow({
    url: "data:text/html,<title>windows API test</title>",
    onOpen: function(window) {
      test.pass("onOpen callback called");
      test.assert(window.title.indexOf("windows API test") != -1, "URL correctly loaded");
      test.assertEqual(window.tabs.length, 1, "Only one tab open");
      test.assertEqual(windows.length, 2, "Two windows open");

      window.close(function() {
        test.assertEqual(this.tabs.length, 0, "Tabs were cleared");
        test.assertEqual(this.title, null, "Window title was cleared");
        test.assertEqual(windows.length, 1, "Only one window open");
        test.done();
      });
    }
  });
}

exports.testOnOpenOnCloseListeners = function(test) {
  test.waitUntilDone();
  let windows = require("windows").browserWindows;

  test.assertEqual(windows.length, 1, "Only one window open");

  let received = {
    listener1: false,
    listener2: false,
    listener3: false,
    listener4: false
  }

   function listener1() {
    if (received.listener1)
      test.fail("Event received twice");
    received.listener1 = true;
  }

  function listener2() {
    if (received.listener2)
      test.fail("Event received twice");
    received.listener2 = true;
  }

  function listener3() {
    if (received.listener3)
      test.fail("Event received twice");
    received.listener3 = true;
  }

  function listener4() {
    if (received.listener4)
      test.fail("Event received twice");
    received.listener4 = true;
  }

  windows.onOpen.add(listener1);
  windows.onOpen.add(listener2);
  windows.onClose.add(listener3);
  windows.onClose.add(listener4);

  function verify() {
    test.assert(received.listener1, "onOpen handler called");
    test.assert(received.listener2, "onOpen handler called");
    test.assert(received.listener3, "onClose handler called");
    test.assert(received.listener4, "onClose handler called");

    windows.onOpen.remove(listener1);
    windows.onOpen.remove(listener2);
    windows.onClose.remove(listener3);
    windows.onClose.remove(listener4);
    test.done();
  }


  windows.openWindow({
    url: "data:text/html,foo",
    onOpen: function(window) {
      window.close(verify);
    }
  });
}

exports.testWindowTabsObject = function(test) {
  test.waitUntilDone();
  let windows = require("windows").browserWindows;

  windows.openWindow({
    url: "data:text/html,<title>tab 1</title>",
    onOpen: function(window) {
      test.assertEqual(window.tabs.length, 1, "Only 1 tab open");
      for (let tab in window.tabs)
        test.assertEqual(tab.title, "tab 1", "Correct tab listing");

      window.tabs.open({
        url: "data:text/html,<title>tab 2</title>",
        inBackground: true,
        onOpen: function(newTab) {
          test.assertEqual(window.tabs.length, 2, "New tab open");
          test.assertEqual(newTab.title, "tab 2", "Correct new tab title");
          test.assertEqual(window.tabs.activeTab.title, "tab 1", "Correct active tab");

          let i = 1;
          for (let tab in window.tabs) {
            let title = "tab " + i++;
            test.assertEqual(tab.title, title, "Correct " + title + " title");
          }

          window.close(function() {
            test.assertEqual(window.tabs.length, 0, "No more tabs on closed window");
            test.done();
          });
        }
      });
    }
  });
}

exports.testActiveWindow = function(test) {
  const xulApp = require("xul-app");
  if (xulApp.versionInRange(xulApp.platformVersion, "1.9.2", "1.9.2.*")) {
    test.pass("This test is disabled on 3.6. For more information, see bug 598525");
    return;
  }

  let windows = require("windows").browserWindows;

  // API window objects
  let window2, window3;

  // Raw window objects
  let nonBrowserWindow, rawWindow2, rawWindow3;

  // Find the first non-browser window: probably the test runner window
  let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
             .getService(Ci.nsIWindowMediator);
  let winEnum = wm.getEnumerator("");
  while (winEnum.hasMoreElements()) {
    let win = winEnum.getNext();
    if (win.document.documentElement.getAttribute("windowtype") != "navigator:browser") {
      nonBrowserWindow = win;
      break;
    }
  }
  if (!nonBrowserWindow) {
    test.fail("This test can't proceed without a non-browser window");
    return;
  }

  test.waitUntilDone();

  let testSteps = [
    function() {
      test.assertEqual(windows.length, 3, "Correct number of browser windows");
      let count = 0;
      for (let window in windows)
        count++;
      test.assertEqual(count, 3, "Correct number of windows returned by iterator");

      rawWindow2.focus();
      continueAfterFocus(rawWindow2);
    },
    function() {
      nonBrowserWindow.focus();
      continueAfterFocus(nonBrowserWindow);
    },
    function() {
      test.assertEqual(windows.activeWindow, null, "Non-browser windows aren't handled by this module");
      windows.activeWindow = window2;
      continueAfterFocus(rawWindow2);
    },
    function() {
      test.assertEqual(windows.activeWindow.title, window2.title, "Correct active window - 2");
      windows.activeWindow = window3;
      continueAfterFocus(rawWindow3);
    },
    function() {
      test.assertEqual(windows.activeWindow.title, window3.title, "Correct active window - 3");
      windows.activeWindow = nonBrowserWindow;
      finishTest();
    }
  ];

  windows.openWindow({
    url: "data:text/html,<title>window 2</title>",
    onOpen: function(window) {
      window2 = window;
      rawWindow2 = wm.getMostRecentWindow("navigator:browser");

      windows.openWindow({
        url: "data:text/html,<title>window 3</title>",
        onOpen: function(window) {
          window3 = window;
          rawWindow3 = wm.getMostRecentWindow("navigator:browser");
          nextStep();
        }
      });
    }
  });

  function nextStep() {
    if (testSteps.length > 0) {
      testSteps.shift()();
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
      nextStep();
    } else {
      childTargetWindow.addEventListener("focus", function focusListener() {
        childTargetWindow.removeEventListener("focus", focusListener, true);
        nextStep();
      }, true);
    }

  }

  function finishTest() {
    window3.close(function() {
      window2.close(function() {
        test.done();
      });
    });
  }

}

// If the module doesn't support the app we're being run in, require() will
// throw.  In that case, remove all tests above from exports, and add one dummy
// test that passes.
try {
  require("windows");
}
catch (err) {
  // This bug should be mentioned in the error message.
  let bug = "https://bugzilla.mozilla.org/show_bug.cgi?id=571449";
  if (err.message.indexOf(bug) < 0)
    throw err;
  for (let [prop, val] in Iterator(exports)) {
    if (/^test/.test(prop) && typeof(val) === "function")
      delete exports[prop];
  }
  exports.testAppNotSupported = function (test) {
    test.pass("the windows module does not support this application.");
  };
}
