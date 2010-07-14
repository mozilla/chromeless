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
 *   Dietrich Ayala <dietrich@mozilla.com> (Original author)
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

var {Cc,Ci} = require("chrome");

// test tab.activeTab getter
exports.testActiveTab_getter = function(test) {
  test.waitUntilDone();

  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");

    let location = "data:text/html,<html><head><title>foo</title></head></html>";
    require("tab-browser").addTab(
      location,
      {
        onLoad: function(e) {
          test.assert(tabs.activeTab); 
          test.assertEqual(tabs.activeTab.location, location); 
          test.assertEqual(tabs.activeTab.title, "foo"); 
          closeBrowserWindow(window, function() test.done());
        }
      }
    );
  });
};

// test tab.activeTab setter
exports.testActiveTab_setter = function(test) {
  test.waitUntilDone();

  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let location = "data:text/html,<html><head><title>foo</title></head></html>";

    tabs.onReady = function(tab) {
      tabs.onReady.remove(arguments.callee);
      test.assertEqual(tabs.activeTab.location, "about:blank", "activeTab location has not changed");
      test.assertEqual(tab.location, location, "location of new background tab matches");
      tab.onActivate = function() {
        tab.onActivate.remove(arguments.callee);
        // TODO anti-random-fail
        require("timer").setTimeout(function() {
          test.assertEqual(tabs.activeTab.location, location, "location after activeTab setter matches");
          closeBrowserWindow(window, function() test.done());
        }, 2000);
      };
      tabs.activeTab = tab;
    };

    tabs.open({
      url: location,
      inBackground: true
    });
  });
};

// test tab properties
exports.testTabProperties = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,<html><head><title>foo</title></head><body>foo</body></html>";
    tabs.open({
      url: url,
      onOpen: function(tab) {
        test.assertEqual(tab.title, "foo", "title of the new tab matches");
        test.assertEqual(tab.location, url, "URL of the new tab matches");
        test.assertEqual(tab.contentWindow, window.content, "contentWindow of the new tab matches");
        test.assertEqual(tab.contentDocument, window.content.document, "contentDocument of the new tab matches");
        test.assert(tab.favicon, "favicon of the new tab is not empty");
        test.assertEqual(tab.style, null, "style of the new tab matches");
        test.assertEqual(tab.index, 1, "index of the new tab matches");
        test.assertNotEqual(tab.thumbnail, null, "thumbnail of the new tab matches");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// test tabs iterator
exports.testTabsIterator= function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let startCount = 0;
    for each (let t in tabs) startCount++;
    let url = "data:text/html,default";
    tabs.open(url);
    tabs.open(url);
    tabs.open({
      url: url,
      onOpen: function(tab) {
        let count = 0;
        for each (let t in tabs) count++;
        test.assertEqual(count, startCount + 3, "iterated tab count matches");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// test tab.location setter
exports.testTabLocation = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url1 = "data:text/html,foo";
    let url2 = "data:text/html,bar";

    tabs.onReady = function(tab) {
      if (tab.location != url2)
        return;
      tabs.onReady.remove(arguments.callee);
      test.pass("tab.load() loaded the correct url");
      closeBrowserWindow(window, function() test.done());
    };

    tabs.open({
      url: url1,
      onOpen: function(tab) tab.location = url2
    });
  });
};

// test tab.close()
exports.testTabClose = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,foo";

    test.assertNotEqual(tabs.activeTab.location, url, "tab is now the active tab");
    tabs.onReady = function(tab) {
      tabs.onReady.remove(arguments.callee);
      test.assertEqual(tabs.activeTab.location, tab.location, "tab is now the active tab");
      tab.close();
      test.assertNotEqual(tabs.activeTab.location, url, "tab is no longer the active tab");
      closeBrowserWindow(window, function() test.done());
    };

    tabs.open(url);
  });
};

// test tab.move()
exports.testTabMove = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,foo";

    tabs.open({
      url: url,
      onOpen: function(tab) {
        test.assertEqual(tab.index, 1, "tab index before move matches");
        tab.move(0);
        test.assertEqual(tab.index, 0, "tab index after move matches");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// open tab with default options
exports.testOpen = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let url = "data:text/html,default";
    tabs.open({
      url: url,
      onOpen: function(tab) {
        test.assertEqual(tab.location, url, "URL of the new tab matches");
        test.assertEqual(window.content.location, url, "URL of active tab in the current window matches");
        closeBrowserWindow(window, function() test.done());
      }
    });
  });
};

// open tab in background
exports.testInBackground = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");
    let activeUrl = tabs.activeTab.location;
    let url = "data:text/html,background";
    test.assertEqual(activeWindow, window, "activeWindow matches this window");
    tabs.onReady = function(tab) {
      tabs.onReady.remove(arguments.callee);
      test.assertEqual(tabs.activeTab.location, activeUrl, "URL of active tab has not changed"); 
      test.assertEqual(tab.location, url, "URL of the new background tab matches");
      test.assertEqual(activeWindow, window, "a new window was not opened");
      test.assertNotEqual(tabs.activeTab.location, url, "URL of active tab is not the new URL"); 
      closeBrowserWindow(window, function() test.done());
    };
    tabs.open({
      url: url,
      inBackground: true
    });
  });
};

// open tab in new window
exports.testOpenInNewWindow = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    let tabs = require("tabs");

    let cache = [];
    let windowUtils = require("window-utils");
    let wt = new windowUtils.WindowTracker({
      onTrack: function(win) {
        cache.push(win);
      },
      onUntrack: function(win) {
        cache.splice(cache.indexOf(win), 1)
      }
    });
    let startWindowCount = cache.length;

    let url = "data:text/html,newwindow";
    tabs.open({
      url: url,
      inNewWindow: true,
      onOpen: function(tab) {
        let newWindow = cache[cache.length - 1];
        test.assertEqual(cache.length, startWindowCount + 1, "a new window was opened");
        test.assertEqual(activeWindow, newWindow, "new window is active");
        test.assertEqual(tab.location, url, "URL of the new tab matches");
        test.assertEqual(newWindow.content.location, url, "URL of new tab in new window matches");
        test.assertEqual(tabs.activeTab.location, url, "URL of activeTab matches"); 
        for (var i in cache) cache[i] = null;
        wt.unload();
        closeBrowserWindow(newWindow, function() {
          closeBrowserWindow(window, function() test.done());
        });
      }
    });
  });
};

// onOpen event handler
exports.testTabsEvent_onOpen = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,1";
    let eventCount = 0;

    // add listener via property assignment
    let listener1 = function(tab) {
      eventCount++;
    };
    tabs.onOpen = listener1;

    // add listener via collection add
    let listener2 = function(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.onOpen.remove(listener1);
      tabs.onOpen.remove(listener2);
      closeBrowserWindow(window, function() test.done());
    };
    tabs.onOpen.add(listener2);

    tabs.open(url);
  });
};

// onClose event handler
exports.testTabsEvent_onClose = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onclose";
    let eventCount = 0;

    // add listener via property assignment
    let listener1 = function(tab) {
      eventCount++;
    };
    tabs.onClose = listener1;

    // add listener via collection add
    let listener2 = function(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.onClose.remove(listener1);
      tabs.onClose.remove(listener2);
      closeBrowserWindow(window, function() test.done());
    };
    tabs.onClose.add(listener2);

    tabs.onReady = function(tab) {
      tabs.onReady.remove(arguments.callee);
      tab.close();
    };

    tabs.open(url);
  });
};

// onReady event handler
exports.testTabsEvent_onReady = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onready";
    let eventCount = 0;

    // add listener via property assignment
    let listener1 = function(tab) {
      eventCount++;
    };
    tabs.onReady = listener1;

    // add listener via collection add
    let listener2 = function(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.onReady.remove(listener1);
      tabs.onReady.remove(listener2);
      closeBrowserWindow(window, function() test.done());
    };
    tabs.onReady.add(listener2);

    tabs.open(url);
  });
};

// onLoad event handler
exports.testTabsEvent_onLoad = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onload";
    let eventCount = 0;

    // add listener via property assignment
    let listener1 = function(tab) {
      eventCount++;
    };
    tabs.onLoad = listener1;

    // add listener via collection add
    let listener2 = function(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.onLoad.remove(listener1);
      tabs.onLoad.remove(listener2);
      closeBrowserWindow(window, function() test.done());
    };
    tabs.onLoad.add(listener2);

    tabs.open(url);
  });
};

// onPaint event handler
exports.testTabsEvent_onPaint = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onpaint";
    let eventCount = 0;

    // add listener via property assignment
    let listener1 = function(tab) {
      eventCount++;
    };
    tabs.onPaint = listener1;

    // add listener via collection add
    let listener2 = function(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.onPaint.remove(listener1);
      tabs.onPaint.remove(listener2);
      closeBrowserWindow(window, function() test.done());
    };
    tabs.onPaint.add(listener2);

    tabs.open(url);
  });
};

// onActivate event handler
exports.testTabsEvent_onActivate = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,onactivate";
    let eventCount = 0;

    // add listener via property assignment
    let listener1 = function(tab) {
      eventCount++;
    };
    tabs.onActivate = listener1;

    // add listener via collection add
    let listener2 = function(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.onActivate.remove(listener1);
      tabs.onActivate.remove(listener2);
      closeBrowserWindow(window, function() test.done());
    };
    tabs.onActivate.add(listener2);

    tabs.open(url);
  });
};

// onDeactivate event handler
exports.testTabsEvent_onDeactivate = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,ondeactivate";
    let eventCount = 0;

    // add listener via property assignment
    let listener1 = function(tab) {
      eventCount++;
    };
    tabs.onDeactivate = listener1;

    // add listener via collection add
    let listener2 = function(tab) {
      test.assertEqual(++eventCount, 2, "both listeners notified");
      tabs.onDeactivate.remove(listener1);
      tabs.onDeactivate.remove(listener2);
      closeBrowserWindow(window, function() test.done());
    };
    tabs.onDeactivate.add(listener2);

    tabs.onOpen = function(tab) {
      tabs.onOpen.remove(arguments.callee);
      tabs.open("data:text/html,foo");
    };

    tabs.open(url);
  });
};

// per-tab event handlers
exports.testPerTabEvents = function(test) {
  test.waitUntilDone();
  openBrowserWindow(function(window, browser) {
    var tabs = require("tabs");
    let url = "data:text/html,foo";
    let eventCount = 0;

    tabs.open({
      url: "about:blank",
      onOpen: function(tab) {
        // add listener via property assignment
        let listener1 = function() {
          eventCount++;
        };
        tab.onReady = listener1;

        // add listener via collection add
        let listener2 = function() {
          eventCount++;
        };
        tab.onReady.add(listener2);

        tab.location = url;

        require("timer").setInterval(function() {
          // if this never occurs, the test'll timeout and fail.
          if (eventCount == 2)
            test.pass("both listeners notified");
          else
            test.fail("listeners not notified!");
          tab.onReady.remove(listener1);
          tab.onReady.remove(listener2);
          closeBrowserWindow(window, function() test.done());
        }, 1000);
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
  window.addEventListener("unload", function() {
    window.removeEventListener("unload", arguments.callee, false);
    callback();
  }, false);
  window.close();
}

// If the module doesn't support the app we're being run in, require() will
// throw.  In that case, remove all tests above from exports, and add one dummy
// test that passes.
try {
  require("tabs");
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
    test.pass("the tabs module does not support this application.");
  };
}
