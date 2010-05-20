/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
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
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Dietrich Ayala <dietrich@mozilla.com> (Original Author)
 *   Drew Willcoxon <adw@mozilla.com>
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

// Widget content types
const CONTENT_TYPE_URI    = 1;
const CONTENT_TYPE_HTML   = 2;
const CONTENT_TYPE_IMAGE  = 3;

// Supported events
const EVENTS = {
  onClick: "click",
  onLoad: "load",
  onMouseover: "mouseover",
  onMouseout: "mouseout",
  onReady: "DOMContentLoaded"};

// Preference for UI visibility state
const PREF_ADDON_BAR_HIDDEN = "jetpack.jetpack-core.widget.barIsHidden";
const PREF_DEFAULT_ADDON_BAR_HIDDEN = false;

if (!require("xul-app").is("Firefox")) {
  throw new Error([
    "The widget module currently supports only Firefox.  In the future ",
    "it will support other applications. Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=560716 for more information."
  ].join(""));
}

const apiutils = require("api-utils");
const collection = require("collection");
const errors = require("errors");
const prefs = require("preferences-service");

// Expose public APIs for creating/adding/removing widgets
exports.Widget = apiutils.publicConstructor(Widget);
exports.add = function(item) browserManager.addItem(item);
exports.remove = function(item) browserManager.removeItem(item);

// The widget object.
function Widget(options) {
  options = apiutils.validateOptions(options, {
    label: {
      is: ["string"],
      ok: function (v) v.length > 0,
      msg: "The widget must have a non-empty label property."
    },
    image: {
      is: ["null", "undefined", "string"],
    },
    content: {
      is: ["null", "undefined", "string"],
    },
    onClick: {
      is: ["function", "array", "null", "undefined"],
    },
    onMouseover: {
      is: ["function", "array", "null", "undefined"],
    },
    onMouseout: {
      is: ["function", "array", "null", "undefined"],
    },
    onLoad: {
      is: ["function", "array", "null", "undefined"],
    },
    onReady: {
      is: ["function", "array", "null", "undefined"],
    }
  });

  if (!(options.image || options.content))
    throw new Error("No image or content property found. Widgets must have one or the other.");

  let self = this;

  this.__defineGetter__("label", function() options.label);

  if (options.image) {
    this.__defineGetter__("image", function() options.image);
    this.__defineSetter__("image", function(image) {
      options.image = image;
      browserManager.updateItem(self, "image", image);
    });
  }

  if (options.content) {
    this.__defineGetter__("content", function() options.content);
    this.__defineSetter__("content", function(content) {
      options.content = content;
      browserManager.updateItem(self, "content", content);
    });
  }

  for (let method in EVENTS) {
    // create collection for the event as a widget property
    collection.addCollectionProperty(this, method);
    // add event handlers
    if (options[method])
      this[method].add(options[method]);
  }

  this.toString = function Widget_toString() {
    return '[object Widget "' + options.label + '"]';
  };
}

// Keeps track of all browser windows.
// Exposes methods for adding/removing/updating widgets
// across all open windows (and future ones).
let browserManager = {
  items: [],
  windows: [],

  // Registers the manager to listen for window openings and closings.  Note
  // that calling this method can cause onTrack to be called immediately if
  // there are open windows.
  init: function () {
    let windowTracker = new (require("window-utils").WindowTracker)(this);
    require("unload").ensure(windowTracker);
  },

  // Registers a window with the manager.  This is a WindowTracker callback.
  onTrack: function browserManager_onTrack(window) {
    if (this._isBrowserWindow(window)) {
      let win = new BrowserWindow(window);
      win.addItems(this.items);
      this.windows.push(win);
    }
  },

  // Unregisters a window from the manager.  It's told to undo all 
  // modifications.  This is a WindowTracker callback.  Note that when
  // WindowTracker is unloaded, it calls onUntrack for every currently opened
  // window.  The browserManager therefore doesn't need to specially handle
  // unload itself, since unloading the browserManager means untracking all
  // currently opened windows.
  onUntrack: function browserManager_onUntrack(window) {
    if (this._isBrowserWindow(window)) {
      for (let i = 0; i < this.windows.length; i++) {
        if (this.windows[i].window == window) {
          let win = this.windows.splice(i, 1)[0];
          win.destroy();
          return;
        }
      }
    }
  },

  // Registers an item with the manager. It's added to the add-on bar of
  // all currently registered windows, and when new windows are registered it
  // will be added to them, too.
  addItem: function browserManager_addItem(item) {
    let idx = this.items.indexOf(item);
    if (idx > -1)
      throw new Error("The widget " + item + " has already been added.");
    this.items.push(item);
    this.windows.forEach(function (w) w.addItems([item]));
  },

  // Updates the content of an item registered with the manager,
  // propagating the change to all windows.
  updateItem: function browserManager_updateItem(item, property, value) {
    let idx = this.items.indexOf(item);
    if (idx == -1)
      throw new Error("The widget " + item + " cannot be updated because it is not currently registered.");
    this.windows.forEach(function (w) w.updateItem(item, property, value));
  },

  // Unregisters an item from the manager.  It's removed from the addon-bar
  // of all windows that are currently registered.
  removeItem: function browserManager_removeItem(item) {
    let idx = this.items.indexOf(item);
    if (idx == -1) {
      throw new Error("The widget " + item + " has not been added " +
                      "and therefore cannot be removed.");
    }
    this.items.splice(idx, 1);
    this.windows.forEach(function (w) w.removeItems([item]));
  },

  _isBrowserWindow: function browserManager__isBrowserWindow(win) {
    let winType = win.document.documentElement.getAttribute("windowtype");
    return winType === "navigator:browser";
  }
};

// Keeps track of a single browser window.  Responsible for providing a
// description of the window's current context and determining whether an item
// matches the current context.
//
// This is where the core of how a widget's content is added to a window lives.
//
// TODO: If other apps besides Firefox want to support the add-on bar in
// whatever way is appropriate for them, plugging in a substitute for this class
// should be the way to do it.  Make it easy for them.  See bug 560716.
function BrowserWindow(window) {
  this.window = window;
  this.doc = window.document;
  this._init();
}

BrowserWindow.prototype = {

  _init: function BW__init() {
    // Array of objects:
    // {
    //   widget: widget object,
    //   node: dom node,
    //   eventListeners: hash of event listeners
    // }
    this._items = [];

    // Add keyboard shortcut for toggling UI.
    this._addKeyCommands();

    // Add main UI
    this._createContainer();

    // Hook up a window-scope function for toggling the UI.
    let self = this;
    this.window.toggleJetpackWidgets = function() self._onToggleUI();

    // Hook up pref observer for UI visibility state.
    const prefsvc = Cc["@mozilla.org/preferences-service;1"].
                    getService(Ci.nsIPrefBranch2);
    prefsvc.addObserver(PREF_ADDON_BAR_HIDDEN, this, false);
  },

  observe: function BW_observe(s, t, d) {
    let val = prefs.get(PREF_ADDON_BAR_HIDDEN, PREF_DEFAULT_ADDON_BAR_HIDDEN);
    this.container.hidden = !!val;
  },

  _addKeyCommands: function BW__addKeyCommands() {
    let key = this.doc.getElementById("jetpack-widget-key");
    if (!key) {
      let key = this.doc.createElement("key");
      key.id = "jetpack-widget-key";
      key.setAttribute("key", "u");
      key.setAttribute("modifiers", "accel,shift");
      key.setAttribute("command", "jetpack-widget-cmd");
      this.doc.getElementById("mainKeyset").appendChild(key);
    }
    this.key = key;
    
    let cmd = this.doc.getElementById("jetpack-widget-cmd");
    if (!cmd) {
      let cmd = this.doc.createElement("command");
      cmd.id = "jetpack-widget-cmd";
      cmd.setAttribute("oncommand", "window.toggleJetpackWidgets();");
      this.doc.getElementById("mainCommandSet").appendChild(cmd);
    }
    this.cmd = cmd;
  },

  // Create the widget container in the main application
  // UI, if not already created.
  _createContainer: function BW__createContainer() {
    var container = this.doc.getElementById("jetpack-widget-panel");
    if (!container) {
      container = this.doc.createElement("hbox");
      container.id = "jetpack-widget-panel";
      container.hidden = require("preferences-service").get("jetpack.jetpack-core.widget.barIsHidden", PREF_DEFAULT_ADDON_BAR_HIDDEN);
      container.setAttribute("style", "height: 100px; padding: 0px; margin: 0px;");

      var statusbar = this.doc.getElementById("status-bar");
      statusbar.parentNode.insertBefore(container, statusbar);
    }
    this.container = container;
  },

  // Update the visibility state for the addon bar.
  _onToggleUI: function BW__onToggleUI() {
    this.container.hidden = !this.container.hidden;
    prefs.set(PREF_ADDON_BAR_HIDDEN, this.container.hidden);
  },

  // Adds an array of items to the window.
  addItems: function BW_addItems(items) {
    items.forEach(this._addItemToWindow, this);
  },
  
  // Update a property of a widget.
  updateItem: function BW_updateItem(updatedItem, property, value) {
    let item = this._items.filter(function(item) item.widget == updatedItem).shift();
    if (item)
      this.setContent(item);
  },
  
  // Add a widget to this window.
  _addItemToWindow: function BW__addItemToWindow(widget) {
    // XUL element container for widget
    let node = this.doc.createElement("hbox");

    // TODO move into a stylesheet
    node.setAttribute("style", [
        "min-height: 24px; min-width: 24px; max-height: 24px; max-width: 24px;",
        "overflow: hidden; margin: 5px; padding: 0px;",
        "border: 1px solid #71798F; -moz-box-shadow: 1px 1px 3px #71798F;",
        "-moz-border-radius: 3px;"
    ].join(""));

    // Add to top-level widget container. Must be done early
    // so that widget content can attach event handlers.
    this.container.appendChild(node);

    let item = {widget: widget, node: node};

    this._fillItem(item);

    this._items.push(item);
  },

  // Initial population of a widget's content.
  _fillItem: function BS__fillItem(item) {
    // Create element
    var iframe = this.doc.createElement("iframe");
    iframe.setAttribute("type", "content");
    iframe.setAttribute("transparent", "transparent");
    iframe.style.overflow = "hidden";
    iframe.style.height = "24px";
    iframe.style.width = "24px";
    iframe.style.border = "none";
    iframe.style.padding = "0px";
    
    // Do this early, because things like contentWindow are null
    // until the node is attached to a document.
    item.node.appendChild(iframe);

    // add event handlers
    this.addEventHandlers(item);

    // set content
    this.setContent(item);
  },

  // Get widget content type.
  // TODO: fully replace with explicit URL/IMG objects once bug 564524 is fixed.
  getContentType: function BW_getContentType(widget) {
    let type = widget.image ? CONTENT_TYPE_IMAGE :
                              CONTENT_TYPE_HTML;
    if (widget.content) {
      try {
        require("url").parse(widget.content);
        type = CONTENT_TYPE_URI;
      } catch(e) {}
    }

    return type;
  },

  // Set widget content.
  setContent: function BW_setContent(item) {
    let type = this.getContentType(item.widget);
    let iframe = item.node.firstElementChild;
    switch (type) {
      case CONTENT_TYPE_HTML:
        iframe.setAttribute("src", "data:text/html," + encodeURI(item.widget.content));
        break;
      case CONTENT_TYPE_URI:
        iframe.setAttribute("src", item.widget.content);
        break;
      case CONTENT_TYPE_IMAGE:
        let imageURL = item.widget.image;
        iframe.setAttribute("src", imageURL);
        break;
      default:
        throw new Error("The widget's type cannot be determined.");
    }
  },

  // Set up all supported events for a widget.
  addEventHandlers: function BW_addEventHandlers(item) {
    // Given an event type (eg: load) return the
    // handler name (eg: onLoad).
    function getHandlerForType(type) {
      for (let handler in EVENTS) {
        if (EVENTS[handler] == type)
          return handler;
      }
      return null;
    }

    // For ignoring about:blank load events
    function loadURIIsMatch(loadedURI, widget) {
      const ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
      let targetURI = ios.newURI(loadedURI, null, null);
      let widgetURL = widget.content ? widget.content :
                      require("self").data.url(widget.image);
      let widgetURI = ios.newURI(widgetURL, null, null);
      return targetURI.equals(widgetURI);
    }

    // Make modifications required for nice default presentation.
    function modifyStyle(doc) {
      // TODO: special-casing of images will be replaced, probably by an
      // image-specific extension of the URI object.
      if (doc.body.childNodes.length == 1 &&
          doc.body.firstElementChild &&
          doc.body.firstElementChild.tagName == "IMG") {
        // Force image content to size.
        // Add-on authors must size their images correctly.
        doc.body.firstElementChild.style.width = "24px";
        doc.body.firstElementChild.style.height = "24px";

      }

      // Allow all content to fill the box by default.
      doc.body.style.margin = "0";
    }

    let contentType = this.getContentType(item.widget);

    let listener = function(e) {
      // URL-specific handling
      if (e.type == "load" &&
          contentType == CONTENT_TYPE_URI || contentType == CONTENT_TYPE_IMAGE) {
        if (!loadURIIsMatch(e.target.location, item.widget))
          return;
      }

      // Content-specific document modifications
      if (e.target.body)
        modifyStyle(e.target);

      // Proxy event to the widget's listeners
      let handler = getHandlerForType(e.type);
      for (let callback in item.widget[handler])
        require("errors").catchAndLog(function(e) callback.apply(item.widget, [e]))(e);
    };

    item.eventListeners = {};
    for (let [method, type] in Iterator(EVENTS)) {
      let iframe = item.node.firstElementChild;
      iframe.addEventListener(type, listener, true, true);

      // Store listeners for later removal
      item.eventListeners[method] = listener;
    }
  },

  // Removes an array of items from the window.
  removeItems: function BW_removeItems(removedItems) {
    removedItems.forEach(function(removedItem, i) {
      let entry = this._items.filter(function(entry) entry.widget == removedItem).shift();
      if (entry) {
        // remove event listeners
        for (let [method, listener] in Iterator(entry.eventListeners))
          entry.node.firstElementChild.removeEventListener(EVENTS[method], listener, true);
        // remove dom node
        this.container.removeChild(entry.node);
        // remove entry
        this._items.splice(i, 1);
      }
    }, this);
  },

  // Undoes all modifications to the window. The BrowserWindow
  // should not be used afterward.
  destroy: function BW_destroy() {
    // Remove all items from the panel
    this._items.forEach(function(item) this.removeItems([item.widget]), this);

    const prefsvc = Cc["@mozilla.org/preferences-service;1"].
                    getService(Ci.nsIPrefBranch2);
    prefsvc.removeObserver(PREF_ADDON_BAR_HIDDEN, this);

    this.window.toggleJetpackWidgets = null;
  }
};

// Init the browserManager only after setting prototypes and such above, because
// it will cause browserManager.onTrack to be called immediately if there are
// open windows.
browserManager.init();
