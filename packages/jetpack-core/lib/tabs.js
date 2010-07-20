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

if (!require("xul-app").is("Firefox")) {
  throw new Error([
    "The tabs module currently supports only Firefox.  In the future ",
    "we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=560716 for more information."
  ].join(""));
}



const {Cc,Ci,Cu} = require("chrome");
var NetUtil = {};
Cu.import("resource://gre/modules/NetUtil.jsm", NetUtil);
NetUtil = NetUtil.NetUtil;
const errors = require("errors");
const apiUtils = require("api-utils");
const collection = require("collection");
const tabBrowser = require("tab-browser");

// Supported tab events
const events = [
  "onActivate",
  "onDeactivate",
  "onOpen",
  "onClose",
  "onReady",
  "onLoad",
  "onPaint"
];

/**
 * Tab
 *
 * Safe object representing a tab.
 */
let tabConstructor = apiUtils.publicConstructor(function(element) {
  if (!element)
    throw new Error("no tab element.");
  let win = element.ownerDocument.defaultView;
  if (!win)
    throw new Error("element has no window.");
  let browser = win.gBrowser.getBrowserForTab(element);

  this.__defineGetter__("title", function() browser.contentDocument.title);
  this.__defineGetter__("location", function() browser.contentDocument.location);
  this.__defineSetter__("location", function(val) browser.contentDocument.location = val);
  this.__defineGetter__("contentWindow", function() browser.contentWindow);
  this.__defineGetter__("contentDocument", function() browser.contentDocument);
  this.__defineGetter__("favicon", function() {
    let pageURI = NetUtil.newURI(browser.contentDocument.location);
    let fs = Cc["@mozilla.org/browser/favicon-service;1"].
             getService(Ci.nsIFaviconService);
    let faviconURL;
    try {
      let faviconURI = fs.getFaviconForPage(pageURI);
      faviconURL = fs.getFaviconDataAsDataURL(faviconURI);
    } catch(ex) {
      let data = getChromeURLContents("chrome://mozapps/skin/places/defaultFavicon.png");
      let encoded = exports.activeTab.contentWindow.btoa(data);
      faviconURL = "data:image/png;base64," + encoded;
    }
    return faviconURL;
  });
  this.__defineGetter__("style", function() null); // TODO
  this.__defineGetter__("index", function() win.gBrowser.getBrowserIndexForDocument(browser.contentDocument));
  this.__defineGetter__("thumbnail", function() getThumbnailCanvasForTab(element, browser.contentWindow));

  this.close = function() win.gBrowser.removeTab(element);
  this.move = function(index) {
    win.gBrowser.moveTabTo(element, index);
  };

  // Set up the event handlers
  let tab = this;
  events.filter(function(e) e != "onOpen").forEach(function(e) {
    // create a collection for each event
    collection.addCollectionProperty(tab, e);
    // make tabs setter for each event, for adding via property assignment
    tab.__defineSetter__(e, function(val) tab[e].add(val));
  });

  // listen for events, filtered on this tab
  eventsTabDelegate.addTabDelegate(this);
});

// Utility to get a thumbnail canvas from a tab object
function getThumbnailCanvasForTab(tabEl, window) {
  var thumbnail = window.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
  thumbnail.mozOpaque = true;
  var window = tabEl.linkedBrowser.contentWindow;
  thumbnail.width = Math.ceil(window.screen.availWidth / 5.75);
  var aspectRatio = 0.5625; // 16:9
  thumbnail.height = Math.round(thumbnail.width * aspectRatio);
  var ctx = thumbnail.getContext("2d");
  var snippetWidth = window.innerWidth * .6;
  var scale = thumbnail.width / snippetWidth;
  ctx.scale(scale, scale);
  ctx.drawWindow(window, window.scrollX, window.scrollY, snippetWidth, snippetWidth * aspectRatio, "rgb(255,255,255)");
  return thumbnail;
}

// Utility to return the contents of the target of a chrome URL
function getChromeURLContents(chromeURL) {
  let io = Cc["@mozilla.org/network/io-service;1"].
           getService(Ci.nsIIOService);
  let channel = io.newChannel(chromeURL, null, null);
  let input = channel.open();
  let stream = Cc["@mozilla.org/binaryinputstream;1"].
               createInstance(Ci.nsIBinaryInputStream); 
  stream.setInputStream(input);
  let str = stream.readBytes(input.available());
  stream.close();
  input.close();
  return str;
}

/**
 * tabs.activeTab
 */
exports.__defineGetter__("activeTab", function() {
  return tabConstructor(tabBrowser.activeTab);
});
exports.__defineSetter__("activeTab", function(tab) {
  // iterate over open windows
  let windowIterator = require("window-utils").windowIterator;
  for (let win in windowIterator()) {
    if (win.gBrowser) {
      // find the tab element at tab.index
      let index = win.gBrowser.getBrowserIndexForDocument(tab.contentDocument);
      if (index > -1) {
        // set as active tab
        let tabElement = win.gBrowser.tabContainer.getItemAtIndex(index);
        win.gBrowser.selectedTab = tabElement;
        // focus the window
        win.focus();
        break;
      }
    }
  }
});

/**
 * tabs.open - open a URL in a new tab
 */
function open(options) {
  if (typeof options === "string")
    options = { url: options };

  options = apiUtils.validateOptions(options, {
    url: {
      is: ["string"]
    },
    inNewWindow: {
      is: ["undefined", "boolean"]
    },
    inBackground: {
      is: ["undefined", "boolean"]
    },
    onOpen: {
      is: ["undefined", "function"]
    }
  });

  // TODO: remove me. maybe implement window-utils.activeWindow?
  const wm = Cc["@mozilla.org/appshell/window-mediator;1"].
             getService(Ci.nsIWindowMediator);
  let win = wm.getMostRecentWindow("navigator:browser");

  if (!win || options.inNewWindow)
    openURLInNewWindow(options);
  else
    openURLInNewTab(options, win);
}
exports.open = open;

function openURLInNewWindow(options) {
  let addTabOptions = {
    inNewWindow: true
  };
  if (options.onOpen) {
    addTabOptions.onLoad = function(e) {
      let win = e.target.defaultView;
      let tabEl = win.gBrowser.tabContainer.childNodes[0];
      let tabBrowser = win.gBrowser.getBrowserForTab(tabEl);
      tabBrowser.addEventListener("load", function(e) {
        tabBrowser.removeEventListener("load", arguments.callee, true);
        let tab = tabConstructor(tabEl);
        require("errors").catchAndLog(function(e) options.onOpen(e))(tab);
      }, true);
    };
  }
  tabBrowser.addTab(options.url.toString(), addTabOptions);
}

function openURLInNewTab(options, window) {
  window.focus();
  let tabEl = window.gBrowser.addTab(options.url.toString());
  if (!options.inBackground)
    window.gBrowser.selectedTab = tabEl;
  if (options.onOpen) {
    let tabBrowser = window.gBrowser.getBrowserForTab(tabEl);
    tabBrowser.addEventListener("load", function(e) {
      // remove event handler from addTab - don't want to be notified
      // for subsequent loads in same tab.
      tabBrowser.removeEventListener("load", arguments.callee, true);
      let tab = tabConstructor(tabEl);
      require("timer").setTimeout(function() {
        require("errors").catchAndLog(function(tab) options.onOpen(tab))(tab);
      }, 10);
    }, true);
  }
}

// Set up the event handlers
events.forEach(function(eventHandler) {
  // create a collection for each event
  collection.addCollectionProperty(exports, eventHandler);
  // make tabs setter for each event, for adding via property assignment
  exports.__defineSetter__(eventHandler, function(val) exports[eventHandler].add(val));
});

// Helper to iterate over a tabbrowser's tabs
function tabIterator(tabbrowser) {
  var tabs = tabbrowser.tabContainer;
  for (var i = 0; i < tabs.children.length; i++) {
    yield tabs.children[i];
  }
}

// Tracker for all tabs across all windows
// This is tab-browser.TabTracker, but with
// support for additional events added.
function TabTracker(delegate) {
  this._delegate = delegate;
  this._tabs = [];
  this._tracker = new tabBrowser.Tracker(this);
  require("unload").ensure(this);
}
TabTracker.prototype = {
  _TAB_EVENTS: ["TabOpen", "TabClose", "TabSelect", "DOMContentLoaded",
                "load", "MozAfterPaint"],
  _safeTrackTab: function safeTrackTab(tab) {
    tab.addEventListener("load", this, false);
    tab.linkedBrowser.addEventListener("MozAfterPaint", this, false);
    this._tabs.push(tab);
    try {
      this._delegate.onTrack(tab);
    } catch (e) {
      console.exception(e);
    }
  },
  _safeUntrackTab: function safeUntrackTab(tab) {
    tab.removeEventListener("load", this, false);
    tab.linkedBrowser.removeEventListener("MozAfterPaint", this, false);
    var index = this._tabs.indexOf(tab);
    if (index == -1)
      throw new Error("internal error: tab not found");
    this._tabs.splice(index, 1);
    try {
      this._delegate.onUntrack(tab);
    } catch (e) {
      console.exception(e);
    }
  },
  _safeSelectTab: function safeSelectTab(tab) {
    var index = this._tabs.indexOf(tab);
    if (index == -1)
      console.error("internal error: tab not found");
    try {
      if (this._delegate.onSelect)
        this._delegate.onSelect(tab);
    } catch (e) {
      console.exception(e);
    }
  },
  _safeDOMContentLoaded: function safeDOMContentLoaded(event) {
    let tabBrowser = event.currentTarget;
    let tabBrowserIndex = tabBrowser.getBrowserIndexForDocument(event.target);
    // TODO: I'm seeing this when loading data url images
    if (tabBrowserIndex == -1)
      return;
    let tab = tabBrowser.tabContainer.getItemAtIndex(tabBrowserIndex);
    let index = this._tabs.indexOf(tab);
    if (index == -1)
      console.error("internal error: tab not found");
    try {
      if (this._delegate.onReady)
        this._delegate.onReady(tab);
    } catch (e) {
      console.exception(e);
    }
  },
  _safeLoad: function safeLoad(event) {
    let tab = event.target;
    let index = this._tabs.indexOf(tab);
    if (index == -1)
      console.error("internal error: tab not found");
    try {
      if (this._delegate.onLoad)
        this._delegate.onLoad(tab);
    } catch (e) {
      console.exception(e);
    }
  },
  _safeMozAfterPaint: function safeMozAfterPaint(event) {
    let win = event.currentTarget.ownerDocument.defaultView;
    let tabIndex = win.gBrowser.getBrowserIndexForDocument(event.target.document);
    if (tabIndex == -1)
      return;
    let tab = win.gBrowser.tabContainer.getItemAtIndex(tabIndex);
    let index = this._tabs.indexOf(tab);
    if (index == -1)
      console.error("internal error: tab not found");
    try {
      if (this._delegate.onPaint)
        this._delegate.onPaint(tab);
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
    case "TabSelect":
      this._safeSelectTab(event.target);
      break;
    case "DOMContentLoaded":
      this._safeDOMContentLoaded(event);
      break;
    case "load":
      this._safeLoad(event);
      break;
    case "MozAfterPaint":
      this._safeMozAfterPaint(event);
      break;
    default:
      throw new Error("internal error: unknown event type: " +
                      event.type);
    }
  },
  onTrack: function onTrack(tabbrowser) {
    for (tab in tabIterator(tabbrowser))
      this._safeTrackTab(tab);
    tabbrowser.tabContainer.addEventListener("TabOpen", this, false);
    tabbrowser.tabContainer.addEventListener("TabClose", this, false);
    tabbrowser.tabContainer.addEventListener("TabSelect", this, false);
    tabbrowser.ownerDocument.defaultView.gBrowser.addEventListener("DOMContentLoaded", this, false);
  },
  onUntrack: function onUntrack(tabbrowser) {
    for (tab in tabIterator(tabbrowser))
      this._safeUntrackTab(tab);
    tabbrowser.tabContainer.removeEventListener("TabOpen", this, false);
    tabbrowser.tabContainer.removeEventListener("TabClose", this, false);
    tabbrowser.tabContainer.removeEventListener("TabSelect", this, false);
    tabbrowser.ownerDocument.defaultView.gBrowser.removeEventListener("DOMContentLoaded", this, false);
  },
  unload: function unload() {
    this._tracker.unload();
  }
};

// Tracker that listens for tab events, and proxies
// them to registered event listeners.
let eventsTabDelegate = {
  selectedTab: null,
  tabs: [],
  addTabDelegate: function TETT_addTabDelegate(tabObj) {
    this.tabs.push(tabObj);
  },
  getElementForTab: function(tabObj) {
    // iterate over open windows
    let windowIterator = require("window-utils").windowIterator;
    for (let win in windowIterator()) {
      if (win.gBrowser) {
        // find the tab element at tab.index
        let index = win.gBrowser.getBrowserIndexForDocument(tabObj.contentDocument);
        if (index > -1)
          return win.gBrowser.tabContainer.getItemAtIndex(index);
      }
    }
    return null;
  },
  pushTabEvent: function TETT_pushTabEvent(event, tab) {
    for (let callback in exports[event]) {
      require("errors").catchAndLog(function(tab) {
        callback(new tabConstructor(tab));
      })(tab);
    }

    if (event != "onOpen") {
      this.tabs.forEach(function(tabObj) {
        if (tabObj[event].length) {
          let tabEl = this.getElementForTab(tabObj);
          if (tabEl == tab) {
            for (let callback in tabObj[event])
              require("errors").catchAndLog(function() callback())();
          }
        }
        // if being closed, remove the tab object from the cache
        // of tabs to notify about events.
        if (event == "onClose")
          this.tabs.splice(this.tabs.indexOf(tabObj), 1);
      }, this);
    }
  },
  unload: function() {
    this.selectTab = null;
    this.tabs.splice(0);
  }
};
require("unload").ensure(eventsTabDelegate);

let eventsTabTracker = new TabTracker({
  onTrack: function TETT_onTrack(tab) {
    eventsTabDelegate.pushTabEvent("onOpen", tab);
  },
  onUntrack: function TETT_onUntrack(tab) {
    eventsTabDelegate.pushTabEvent("onClose", tab);
  },
  onSelect: function TETT_onSelect(tab) {
    if (eventsTabDelegate.selectedTab)
      eventsTabDelegate.pushTabEvent("onDeactivate", tab);

    eventsTabDelegate.selectedTab = new tabConstructor(tab);

    eventsTabDelegate.pushTabEvent("onActivate", tab);
  },
  onReady: function TETT_onReady(tab) {
    eventsTabDelegate.pushTabEvent("onReady", tab);
  },
  onLoad: function TETT_onLoad(tab) {
    eventsTabDelegate.pushTabEvent("onLoad", tab);
  },
  onPaint: function TETT_onPaint(tab) {
    eventsTabDelegate.pushTabEvent("onPaint", tab);
  }
});
require("unload").ensure(eventsTabTracker);

// Iterator for all tabs
exports.__iterator__ = function tabsIterator() {
  for (let i = 0; i < eventsTabTracker._tabs.length; i++)
    yield tabConstructor(eventsTabTracker._tabs[i]);
}

// Cleanup when unloaded
function unload() {
  // Unregister tabs event listeners
  events.forEach(function(e) exports[e] = []);
}
require("unload").ensure(this);
