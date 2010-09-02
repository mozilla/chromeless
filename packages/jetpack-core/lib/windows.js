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

if (!require("xul-app").is("Firefox")) {
  throw new Error([
    "The windows module currently supports only Firefox. In the future",
    " we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=571449 for more information."
  ].join(""));
}

const tabBrowser = require("tab-browser");
const TabModule = tabBrowser.TabModule;
const windowUtils = require("window-utils");
const collection = require("collection");
const apiUtils = require("api-utils");
const errors = require("errors");
const {Cc,Ci} = require("chrome");

const events = [
  "onOpen",
  "onClose"
];

/**
 * BrowserWindow
 *
 * Safe object representing a browser window
 */
function BrowserWindow(element) {
  if (!isBrowserWindow(element))
    throw new Error("Element is not a browser window");

  this.__defineGetter__("tabs", function() {
    let tabs = new TabModule(element);
    delete this.tabs;
    this.__defineGetter__("tabs", function() tabs);
    return tabs;
  })

  this.__defineGetter__("title", function() element.document.title);

  this.close = function(callback) {
    if (callback)
      windowMap.addCloseCallback(element, callback);

    element.close();
  }
};

/**
 * windows.browserWindows.__iterator__
 * windows.browserWindows.length
 * windows.browserWindows.activeWindow
 * windows.browserWindows.openWindow
 */
exports.browserWindows = {
  __iterator__: function() {
    let winEnum = Cc["@mozilla.org/appshell/window-mediator;1"]
               .getService(Ci.nsIWindowMediator)
               .getEnumerator("navigator:browser");
    while (winEnum.hasMoreElements())
      yield windowMap.getWindowObject(winEnum.getNext());
  },

  get length() {
    let count = 0;
    let enum = Cc["@mozilla.org/appshell/window-mediator;1"]
               .getService(Ci.nsIWindowMediator)
               .getEnumerator("navigator:browser");
    while (enum.hasMoreElements()) {
      count++;
      enum.getNext();
    }

    return count;
  },

  get activeWindow() {
    return windowMap.getWindowObject(windowUtils.activeWindow);
  },
  set activeWindow(safeWindow) {
    let element = windowMap.getWindowElement(safeWindow);
    if (element)
      windowUtils.activeWindow = element;
  },

  openWindow: function(options) {
    if (typeof options === "string")
      options = { url: options };

    options = apiUtils.validateOptions(options, {
      url: {
        is: ["undefined", "string"]
      },
      onOpen: {
        is: ["undefined", "function"]
      }
    });

    if (!options.url)
      options.url = "about:blank";

    let addTabOptions = {
      inNewWindow: true
    };

    if (options.onOpen) {
      addTabOptions.onLoad = function(e) {
        let win = e.target.defaultView;
        let safeWindowObj = windowMap.create(win);
        let tabEl = win.gBrowser.tabContainer.childNodes[0];
        let tabBrowser = win.gBrowser.getBrowserForTab(tabEl);
        tabBrowser.addEventListener("load", function(e) {
          tabBrowser.removeEventListener("load", arguments.callee, true);
          errors.catchAndLog(function(e) options.onOpen(e))(safeWindowObj);
        }, true);
      };
    }
    tabBrowser.addTab(options.url.toString(), addTabOptions);
  }
};


/**
 * windows.browserWindows.onOpen, windows.browserWindows.onClose
 */
events.forEach(function(e) {
  // create a collection for each event
  collection.addCollectionProperty(exports.browserWindows, e);
});

// Mapping between safeWindowObject <-> nsIDOMWindow element
let windowMap = {
  cache: [],
  create: function(windowElement) {
    let windowObject = this.getWindowObject(windowElement);
    if (windowObject)
      return windowObject;

    try {
      windowObject = new BrowserWindow(windowElement);
    } catch (e if e.message == "Element is not a browser window") {
      return null;
    }

    this.cache.push({
      windowObject: windowObject,
      windowElement: windowElement
    });
    return windowObject;
  },
  destroy: function(windowObject) {
    for each (let entry in this.cache) {
      if (entry.windowObject == windowObject) {
        delete windowObject.tabs;
        windowObject.__defineGetter__("tabs", function() []);
        delete windowObject.title;
        windowObject.__defineGetter__("title", function() null);

        if (entry.closeCallback) {
          errors.catchAndLog(function() {
            entry.closeCallback.call(windowObject);
          })();
          entry.closeCallback = null;
        }

        let index = this.cache.indexOf(entry);
        this.cache.splice(index, 1);
        return;
      }
    }
  },
  getWindowObject: function(windowElement) {
    for each (let entry in this.cache)
      if (windowElement == entry.windowElement)
        return entry.windowObject;
    
    return null;
  },
  getWindowElement: function(windowObject) {
    for each (let entry in this.cache)
      if (windowObject == entry.windowObject)
        return entry.windowElement;
    
    return null;
  },
  addCloseCallback: function(windowElement, callback) {
    for each (let entry in this.cache) {
      if (windowElement == entry.windowElement) {
        entry.closeCallback = callback;
        break;
      }
    }
  }
}

// Listen for window notifications, calls the onOpen/onClose handlers
// and update map of window objects
let windowDelegate = {
  onTrack: function(window) {
    let safeWindowObj = windowMap.create(window);
    if (!safeWindowObj)
      return;
    for (let callback in exports.browserWindows.onOpen) {
      errors.catchAndLog(function(safeWindowObj) {
        callback.call(exports.browserWindows, safeWindowObj);
      })(safeWindowObj);
    }
  },
  onUntrack: function(window) {
    let safeWindowObj = windowMap.getWindowObject(window);
    for (let callback in exports.browserWindows.onClose) {
      errors.catchAndLog(function(safeWindowObj) {
        callback.call(exports.browserWindows, safeWindowObj);
      })(safeWindowObj);
    }

    windowMap.destroy(safeWindowObj);
  }
};
let windowTracker = new windowUtils.WindowTracker(windowDelegate);


function isBrowserWindow(window) {
  try {
    return window.document.documentElement
           .getAttribute("windowtype") == "navigator:browser";
  } catch (e) { }
  return false;
}

function unload() {
  windowMap.cache = null;
  windowMap = null;
  // Unregister tabs event listeners
  events.forEach(function(e) exports.browserWindows[e] = []);
}
require("unload").ensure(this);
