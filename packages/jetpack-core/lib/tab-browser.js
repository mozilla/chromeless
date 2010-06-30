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

const {Cc,Ci} = require("chrome");
const errors = require("errors");
const windowUtils = require("window-utils");
const apiUtils = require("api-utils");

// TODO: The hard-coding of app-specific info here isn't very nice;
// ideally such app-specific info should be more decoupled, and the
// module should be extensible, allowing for support of new apps at
// runtime, perhaps by inspecting supported packages (e.g. via
// dynamically-named modules or package-defined extension points).

if (!require("xul-app").is("Firefox")) {
  throw new Error([
    "The tab-browser module currently supports only Firefox.  In the future ",
    "it will support other applications. Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=560716 for more information."
  ].join(""));
}

// Utility function to open a new browser window.
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
        try {
          require("timer").setTimeout(function () {
            callback(event);
          }, 10);
        } catch (e) { console.exception(e); }
      }
    }

    window.addEventListener("load", onLoad, true);
  }

  return window;
}

// Open a URL in a new tab
exports.addTab = function addTab(url, options) {
  if (!options)
    options = {};
  options.url = url;

  options = apiUtils.validateOptions(options, {
    // TODO: take URL object instead of string (bug 564524)
    url: {
      is: ["string"],
      ok: function (v) !!v,
      msg: "The url parameter must have be a non-empty string."
    },
    inNewWindow: {
      is: ["undefined", "null", "boolean"]
    },
    // TODO: test this
    openInBackground: {
      is: ["undefined", "null", "boolean"]
    },
    onLoad: {
      is: ["undefined", "null", "function"]
    }
  });

  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);
  var win = wm.getMostRecentWindow("navigator:browser");
  if (!win || options.inNewWindow) {
    openBrowserWindow(function(e) {
      require("errors").catchAndLog(function(e) options.onLoad(e))(e);
    }, options.url);
  } else {
    let tab = win.gBrowser.addTab(options.url);
    if (!options.openInBackground)
      win.gBrowser.selectedTab = tab;
    if (options.onLoad) {
      let tabBrowser = win.gBrowser.getBrowserForTab(tab);
      tabBrowser.addEventListener("load", function(e) {
        // remove event handler from addTab - don't want notified
        // for subsequent loads in same tab.
        tabBrowser.removeEventListener("load", arguments.callee, true);
        require("errors").catchAndLog(function(e) options.onLoad(e))(e);
      }, true);
    }
  }
}

// Iterate over a window's tabbrowsers
function tabBrowserIterator(window) {
  var browsers = window.document.querySelectorAll("tabbrowser");
  for (var i = 0; i < browsers.length; i++)
    yield browsers[i];
}

// Iterate over a tabbrowser's tabs
function tabIterator(tabbrowser) {
  var tabs = tabbrowser.tabContainer;
  for (var i = 0; i < tabs.children.length; i++) {
    yield tabs.children[i];
  }
}

// Tracker for all tabbrowsers across all windows
function Tracker(delegate) {
  this._delegate = delegate;
  this._browsers = [];
  this._windowTracker = new windowUtils.WindowTracker(this);

  require("unload").ensure(this);
}
Tracker.prototype = {
  __iterator__: function __iterator__() {
    for (var i = 0; i < this._browsers.length; i++)
      yield this._browsers[i];
  },
  get: function get(index) {
    return this._browsers[index];
  },
  onTrack: function onTrack(window) {
    for (browser in tabBrowserIterator(window))
      this._browsers.push(browser);
    if (this._delegate)
      for (browser in tabBrowserIterator(window))
        this._delegate.onTrack(browser);
  },
  onUntrack: function onUntrack(window) {
    for (browser in tabBrowserIterator(window)) {
      let index = this._browsers.indexOf(browser);
      if (index != -1)
        this._browsers.splice(index, 1);
      else
        console.error("internal error: browser tab not found");
    }
    if (this._delegate)
      for (browser in tabBrowserIterator(window))
        this._delegate.onUntrack(browser);
  },
  get length() {
    return this._browsers.length;
  },
  unload: function unload() {
    this._windowTracker.unload();
  }
};
exports.Tracker = apiUtils.publicConstructor(Tracker);

// Tracker for all tabs across all windows
function TabTracker(delegate) {
  this._delegate = delegate;
  this._tabs = [];
  this._tracker = new Tracker(this);
  require("unload").ensure(this);
}
TabTracker.prototype = {
  _TAB_EVENTS: ["TabOpen", "TabClose"],
  _safeTrackTab: function safeTrackTab(tab) {
    this._tabs.push(tab);
    try {
      this._delegate.onTrack(tab);
    } catch (e) {
      console.exception(e);
    }
  },
  _safeUntrackTab: function safeUntrackTab(tab) {
    var index = this._tabs.indexOf(tab);
    if (index == -1)
      console.error("internal error: tab not found");
    this._tabs.splice(index, 1);
    try {
      this._delegate.onUntrack(tab);
    } catch (e) {
      console.exception(e);
    }
  },
  handleEvent: function handleEvent(event) {
    switch (event.type) {
    case "TabOpen":
      this._safeTrackTab(event.target);
      break;
    case "TabClose":
      this._safeUntrackTab(event.target);
      break;
    default:
      throw new Error("internal error: unknown event type: " +
                      event.type);
    }
  },
  onTrack: function onTrack(tabbrowser) {
    for (tab in tabIterator(tabbrowser))
      this._safeTrackTab(tab);
    var self = this;
    this._TAB_EVENTS.forEach(
      function(eventName) {
        tabbrowser.tabContainer.addEventListener(eventName, self, true);
      });
  },
  onUntrack: function onUntrack(tabbrowser) {
    for (tab in tabIterator(tabbrowser))
      this._safeUntrackTab(tab);
    var self = this;
    this._TAB_EVENTS.forEach(
      function(eventName) {
        tabbrowser.tabContainer.removeEventListener(eventName, self, true);
      });
  },
  unload: function unload() {
    this._tracker.unload();
  }
};
exports.TabTracker = apiUtils.publicConstructor(TabTracker);

errors.catchAndLogProps(TabTracker.prototype, ["handleEvent"]);

exports.whenContentLoaded = function whenContentLoaded(callback) {
  var cb = require("errors").catchAndLog(function eventHandler(event) {
    if (event.target && event.target.defaultView)
      callback(event.target.defaultView);
  });

  var tracker = new Tracker({
    onTrack: function(tabBrowser) {
      tabBrowser.addEventListener("DOMContentLoaded", cb, false);
    },
    onUntrack: function(tabBrowser) {
      tabBrowser.removeEventListener("DOMContentLoaded", cb, false);
    }
  });

  return tracker;
};

exports.__defineGetter__("activeTab", function() {
  const wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
  let mainWindow = wm.getMostRecentWindow("navigator:browser");
  return mainWindow.gBrowser.selectedTab;
});
