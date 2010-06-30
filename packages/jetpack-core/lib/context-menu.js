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
 *   Drew Willcoxon <adw@mozilla.com> (Original Author)
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

const {Ci} = require("chrome");

if (!require("xul-app").is("Firefox")) {
  throw new Error([
    "The context-menu module currently supports only Firefox.  In the future ",
    "we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=560716 for more information."
  ].join(""));
}

const apiUtils = require("api-utils");
const collection = require("collection");

// All user items we add have this class name.
const ITEM_CLASS = "jetpack-context-menu-item";

// Items in the top-level context menu also have this class.
const TOPLEVEL_ITEM_CLASS = "jetpack-context-menu-item-toplevel";

// Items in the overflow submenu also have this class.
const OVERFLOW_ITEM_CLASS = "jetpack-context-menu-item-overflow";

// The ID of the menu separator that separates standard context menu items from
// our user items.
const SEPARATOR_ID = "jetpack-context-menu-separator";

// If more than this number of items are added to the context menu, all items
// overflow into a "Jetpack" submenu.
const OVERFLOW_THRESH_DEFAULT = 10;
const OVERFLOW_THRESH_PREF =
  "jetpack.jetpack-core.context-menu.overflowThreshold";

// The label of the overflow sub-<menu>.
//
// TODO: Localize this.
const OVERFLOW_MENU_LABEL = "Jetpack";

// The ID of the overflow sub-<menu>.
const OVERFLOW_MENU_ID = "jetpack-content-menu-overflow-menu";

// The ID of the overflow submenu's <menupopup>.
const OVERFLOW_POPUP_ID = "jetpack-content-menu-overflow-popup";

// These are used by BrowserWindow._isPageContextCurrent below.  If the
// popupNode or any of its ancestors is one of these, Firefox uses a tailored
// context menu, and so the page context doesn't apply.
const NON_PAGE_CONTEXT_ELTS = [
  Ci.nsIDOMHTMLAnchorElement,
  Ci.nsIDOMHTMLAppletElement,
  Ci.nsIDOMHTMLAreaElement,
  Ci.nsIDOMHTMLButtonElement,
  Ci.nsIDOMHTMLCanvasElement,
  Ci.nsIDOMHTMLEmbedElement,
  Ci.nsIDOMHTMLImageElement,
  Ci.nsIDOMHTMLInputElement,
  Ci.nsIDOMHTMLIsIndexElement,
  Ci.nsIDOMHTMLMapElement,
  Ci.nsIDOMHTMLMediaElement,
  Ci.nsIDOMHTMLMenuElement,
  Ci.nsIDOMHTMLObjectElement,
  Ci.nsIDOMHTMLOptionElement,
  Ci.nsIDOMHTMLSelectElement,
  Ci.nsIDOMHTMLTextAreaElement,
];


exports.Item = apiUtils.publicConstructor(Item);
exports.Menu = apiUtils.publicConstructor(Menu);
exports.Separator = apiUtils.publicConstructor(Separator);

/**
 * Adds an item to the context menu.
 *
 * @param item
 *        The item to add, an Item or Menu.  Separators can only be added to
 *        submenus, not the top-level context menu.
 */
exports.add = function contextMenu_add(item) {
  if (item instanceof Separator) {
    throw new Error("Separators cannot be added to the top-level " +
                    "context menu.");
  }
  browserManager.addItem(item);
};

/**
 * Removes an item from the context menu.
 *
 * @param item
 *        The item to remove.  It must have been previously added.
 */
exports.remove = function contextMenu_remove(item) {
  browserManager.removeItem(item);
};

// This is exported only to test it, on the suggestion of bug 548590 comment 30.
exports._insertionPoint = insertionPoint;


/**
 * Creates a simple menu item.
 *
 * @params options
 *         If any of the following options are invalid, an error is thrown:
 *         @prop label
 *               The item's label.  It must be either a string or an object that
 *               implements toString().
 *         @prop data
 *               An optional arbitrary value to associate with the item.  It
 *               must be either a string or an object that implements
 *               toString().
 *         @prop onClick
 *               An optional function that will be called when the item is
 *               clicked.  It is called as onClick(contextObj, item).
 *               contextObj is an object describing the context in which the
 *               context menu was invoked: { node, document, window }, where
 *               node is the node the user right-clicked to invoke the menu,
 *               document is the node's document, and window is the document's
 *               window.  item is the item itself.
 *         @prop context
 *               If the item is added to the top-level context menu, this
 *               specifies the context under which the item will appear.  It
 *               must be a string, function, undefined or null, or an array.  If
 *               undefined, the page context is assumed.  Ignored if the item is
 *               contained in a submenu.
 */
function Item(options) {
  options = apiUtils.validateOptions(options, {
    context: {
      is: ["undefined", "null", "string", "function", "array"]
    },
    data: {
      map: function (v) v.toString(),
      is: ["string", "undefined"]
    },
    label: {
      map: function (v) v.toString(),
      is: ["string"],
      ok: function (v) !!v,
      msg: "The item must have a non-empty string label."
    },
    onClick: {
      is: ["function", "undefined"]
    }
  });

  // TODO: Add setters for these.  Updating label and data would require finding
  // this item's DOM element and changing its attributes as well.
  this.__defineGetter__("label", function () options.label);
  this.__defineGetter__("onClick", function () options.onClick || undefined);
  this.__defineGetter__("data", function () {
    return "data" in options ? options.data : undefined;
  });

  collection.addCollectionProperty(this, "context");
  if (options.context)
    this.context.add(options.context);

  this.toString = function Item_toString() {
    return '[object Item "' + options.label + '"]';
  };
}

/**
 * Creates an item that expands into a submenu.
 *
 * @params options
 *         If any of the following options are invalid, an error is thrown:
 *         @prop label
 *               The menu's label.  It must be either a string or an object that
 *               implements toString().
 *         @prop items
 *               An array of items that the menu will contain.
 *         @prop onClick
 *               An optional function that will be called when any of the menu's
 *               Item descendants is clicked. (The onClicks of descendants are
 *               invoked first, in a bottom-up, bubbling manner.)  It is called
 *               as onClick(contextObj, item).  contextObj is an object
 *               describing the context in which the context menu was invoked:
 *               { node, document, window }, where node is the node the user
 *               right-clicked to invoke the menu, document is the node's
 *               document, and window is the document's window.  item is the
 *               the item that was clicked.
 *         @prop context
 *               If the item is added to the top-level context menu, this
 *               specifies the context under which the item will appear.  It
 *               must be a string, function, undefined or null, or an array.  If
 *               undefined, the page context is assumed.  Ignored if the item is
 *               contained in a submenu.
 */
function Menu(options) {
  options = apiUtils.validateOptions(options, {
    context: {
      is: ["undefined", "null", "string", "function", "array"]
    },
    items: {
      is: ["array"]
    },
    label: {
      map: function (v) v.toString(),
      is: ["string"],
      ok: function (v) !!v,
      msg: "The menu must have a non-empty string label."
    },
    onClick: {
      is: ["function", "undefined"]
    }
  });

  // TODO: Add setters for these.  Updating label and items would require
  // finding this menus's DOM element updating it as well.
  this.__defineGetter__("label", function () options.label);
  this.__defineGetter__("items", function () options.items.slice(0));
  this.__defineGetter__("onClick", function () options.onClick || undefined);

  collection.addCollectionProperty(this, "context");
  if (options.context)
    this.context.add(options.context);

  this.toString = function Menu_toString() {
    return '[object Menu "' + options.label + '"]';
  };
}

/**
 * Creates a menu separator.
 */
function Separator() {
  this.toString = function Separator_toString() {
    return "[object Separator]";
  };
}


// Does a binary search on elts, a NodeList, and returns the DOM element
// before which an item with targetLabel should be inserted.  null is returned
// if the new item should be inserted at the end.
function insertionPoint(targetLabel, elts) {
  let from = 0;
  let to = elts.length - 1;

  while (from <= to) {
    let i = Math.floor((from + to) / 2);
    let comp = targetLabel.localeCompare(elts[i].getAttribute("label"));
    if (comp < 0)
      to = i - 1;
    else if (comp > 0)
      from = i + 1;
    else
      return elts[i];
  }
  return elts[from] || null;
}


// Keeps track of all browser windows.
let browserManager = {
  items: [],
  windows: [],

  // Registers an item with the manager.  It's added to the context menus of
  // all currently registered windows, and when new windows are registered it
  // will be added to them, too.
  addItem: function browserManager_addItem(item) {
    this.items.push(item);
    this.windows.forEach(function (w) w.addItems([item]));
  },

  // Registers the manager to listen for window openings and closings.  Note
  // that calling this method can cause onTrack to be called immediately if
  // there are open windows.
  init: function browserManager_init() {
    let windowTracker = new (require("window-utils").WindowTracker)(this);
    require("unload").ensure(windowTracker);
  },

  // Registers a window with the manager.  This is a WindowTracker callback.
  onTrack: function browserManager_onTrack(window) {
    if (this._isBrowserWindow(window)) {
      let win = new BrowserWindow(window);
      this.windows.push(win);
      win.addItems(this.items);
    }
  },

  // Unregisters a window from the manager.  It's told to undo all menu
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

  // Unregisters an item from the manager.  It's removed from the context menus
  // of all windows that are currently registered.
  removeItem: function browserManager_removeItem(item) {
    let idx = this.items.indexOf(item);
    if (idx < 0) {
      throw new Error("The item " + item + " has not been added to the menu " +
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
// TODO: If other apps besides Firefox want to support the context menu in
// whatever way is appropriate for them, plugging in a substitute for this class
// should be the way to do it.  Make it easy for them.  See bug 560716.
function BrowserWindow(window) {
  this.window = window;
  this.doc = window.document;

  let popup = this.doc.getElementById("contentAreaContextMenu");
  if (!popup)
    throw new Error("Internal error: Context menu popup not found.");

  this.contextMenuPopup = new ContextMenuPopup(popup, this);
}

BrowserWindow.prototype = {

  // Adds an array of items to the window's context menu.
  addItems: function BW_addItems(items) {
    this.contextMenuPopup.addItems(items);
  },

  // Returns an object describing the current context.  This object may need to
  // be slightly adjusted to match the context of a top-level item.  If not,
  // topLevelItem need not be given.
  contextObj: function BW_contextObj(topLevelItem) {
    let node = this.doc.popupNode;

    if (topLevelItem) {
      for (let ctxt in topLevelItem.context) {
        if (typeof(ctxt) === "string") {
          let ctxtNode = this._popupNodeMatchingSelector(ctxt);
          if (ctxtNode) {
            node = ctxtNode;
            break;
          }
        }
      }
    }

    return {
      node: node,
      // Just to be safe, don't assume popupNode is non-null.
      document: node ? node.ownerDocument : null,
      window: node ? node.ownerDocument.defaultView : null
    };
  },

  // Undoes all modifications to the window's context menu.  The BrowserWindow
  // should not be used afterward.
  destroy: function BW_destroy() {
    this.contextMenuPopup.destroy();
  },

  // Returns true if any of item's contexts is current in the window.
  isAnyContextCurrent: function BW_isAnyContextCurrent(item) {
    if (!item.context.length)
      return this._isPageContextCurrent();

    for (let ctxt in item.context) {
      let t = typeof(ctxt);
      let curr = !ctxt ? this._isPageContextCurrent() :
                 t === "string" ? this._isSelectorContextCurrent(ctxt) :
                 t === "function" ? this._isFunctionContextCurrent(item, ctxt) :
                 false;
      if (curr)
        return true;
    }
    return false;
  },

  // Removes an array of items from the window's context menu.
  removeItems: function BW_removeItems(items) {
    this.contextMenuPopup.removeItems(items);
  },

  // Returns true if func returns true given the window's current context.  item
  // is needed because it is |this| inside of func.
  _isFunctionContextCurrent: function BW__isFunctionContextCurrent(item, func) {
    try {
      return !!func.call(item, this.contextObj());
    }
    catch (err) {
      console.exception(err);
    }
    return false;
  },

  // Returns true if the page context is current in the window.  The page
  // context arises when the user invokes the context menu on a non-interactive
  // part of the page.
  _isPageContextCurrent: function BW__isPageContextCurrent() {
    let popupNode = this.doc.popupNode;
    let contentWin = popupNode ? popupNode.ownerDocument.defaultView : null;
    if (contentWin && !contentWin.getSelection().isCollapsed)
      return false;

    let cursor = popupNode;
    while (cursor && !(cursor instanceof Ci.nsIDOMHTMLHtmlElement)) {
      if (NON_PAGE_CONTEXT_ELTS.some(function (iface) cursor instanceof iface))
        return false;
      cursor = cursor.parentNode;
    }
    return true;
  },

  // Returns true if the node the user clicked to invoke the context menu or
  // any of the node's ancestors matches the given CSS selector.
  _isSelectorContextCurrent: function BW__isSelectorContextCurrent(selector) {
    return !!this._popupNodeMatchingSelector(selector);
  },

  // Returns popupNode if it matches selector, or the closest ancestor of
  // popupNode that matches selector, or null if popupNode and none of its
  // ancestors matches selector.
  _popupNodeMatchingSelector: function BW__popupNodeMatchingSelector(selector) {
    let cursor = this.doc.popupNode;
    while (cursor && !(cursor instanceof Ci.nsIDOMHTMLHtmlElement)) {
      if (cursor.mozMatchesSelector(selector))
        return cursor;
      cursor = cursor.parentNode;
    }
    return null;
  }
};


// Represents a container of items that's the child of the given Menu and Popup.
// popupElt is a <menupopup> that represents the popup in the DOM, and window is
// the BrowserWindow containing the popup.  The popup is responsible for
// creating and adding items to poupElt and handling command events.
function Popup(parentMenu, parentPopup, popupElt, window) {
  this.parentMenu = parentMenu;
  this.parentPopup = parentPopup;
  this.popupElt = popupElt;
  this.window = window;
  this.doc = popupElt.ownerDocument;

  // Keeps track of the DOM elements owned by this popup: { item, elt }.
  this.itemWrappers = [];

  popupElt.addEventListener("command", this, false);
}

Popup.prototype = {

  // Adds an array of items to the popup.
  addItems: function Popup_addItems(items) {
    for (let i = 0; i < items.length; i++) {
      let wrapper = { item: items[i], elt: this._makeItemElt(items[i]) };
      this.itemWrappers.push(wrapper);
      this.popupElt.appendChild(wrapper.elt);
    }
  },

  // Undoes all modifications to the popup.  The popup should not be used
  // afterward.
  destroy: function Popup_destroy() {
    this.popupElt.removeEventListener("command", this, false);
  },

  // The popup is responsible for two command events: those originating at items
  // in the popup and those bubbling to the popup's parent menu.  In the first
  // case the popup calls the item's onClick method, and in the second the popup
  // calls its parent menu's onClick -- in that order.
  handleEvent: function Popup_handleEvent(event) {
    try {
      let elt = event.target;
      if (elt.className.split(/\s+/).indexOf(ITEM_CLASS) >= 0) {
        // If the event originated at an item in the popup, call its onClick.
        // Also set Popup.clickedItem and contextObj so ancestor popups know
        // which item was clicked and under what context.
        let childItemWrapper = this._findItemWrapper(elt);
        if (childItemWrapper) {
          let clickedItem = childItemWrapper.item;
          let topLevelItem = this._topLevelItem(clickedItem);
          let contextObj = this.window.contextObj(topLevelItem);
          Popup.clickedItem = clickedItem;
          Popup.contextObj = contextObj;

          if (clickedItem.onClick) {
            try {
              clickedItem.onClick(contextObj, clickedItem);
            }
            catch (err) {
              console.exception(err);
            }
          }
        }

        // Call the onClick of this popup's parent menu.
        if (this.parentMenu && this.parentMenu.onClick) {
          try {
            this.parentMenu.onClick(Popup.contextObj, Popup.clickedItem);
          }
          catch (err) {
            console.exception(err);
          }
        }
      }
    }
    catch (err) {
      console.exception(err);
    }
  },

  // Returns true if the DOM element is owned by the wrapper.
  _eltMatchesItemWrapper: function Popup__eltMatchesItemWrap(elt, itemWrapper) {
    return elt == itemWrapper.elt;
  },

  // Given a DOM element, returns the item wrapper that owns it or null if none.
  _findItemWrapper: function Popup__findItemWrapper(elt) {
    for (let i = 0; i < this.itemWrappers.length; i++) {
      let wrapper = this.itemWrappers[i];
      if (this._eltMatchesItemWrapper(elt, wrapper))
        return wrapper;
    }
    return null;
  },

  // Returns a DOM element representing the item.  All elements will have the
  // ITEM_CLASS class, and className can optionally be used to add another.
  _makeItemElt: function Popup__makeItemElt(item, className) {
    let elt = item instanceof Item ? this._makeMenuitem(item, className) :
              item instanceof Menu ? this._makeMenu(item, className) :
              item instanceof Separator ? this._makeSeparator(className) :
              null;
    if (!elt)
      throw new Error("Internal error: can't make element, unknown item type");

    return elt;
  },

  // Returns a new <menu> representing the menu.
  _makeMenu: function Popup__makeMenu(menu, className) {
    let menuElt = this.doc.createElement("menu");
    menuElt.className = ITEM_CLASS + (className ? " " + className : "");
    menuElt.setAttribute("label", menu.label);
    let popupElt = this.doc.createElement("menupopup");
    menuElt.appendChild(popupElt);

    // Once items are added, this value can be thrown away.  The popup handles
    // popupshowing on its own.
    let popup = new Popup(menu, this, popupElt, this.window);
    popup.addItems(menu.items);

    return menuElt;
  },

  // Returns a new <menuitem> representing the item.
  _makeMenuitem: function Popup__makeMenuitem(item, className) {
    let elt = this.doc.createElement("menuitem");
    elt.className = ITEM_CLASS + (className ? " " + className : "");
    elt.setAttribute("label", item.label);
    if (item.data)
      elt.setAttribute("value", item.data);
    return elt;
  },

  // Returns a new <menuseparator>.
  _makeSeparator: function Popup__makeSeparator(className) {
    let elt = this.doc.createElement("menuseparator");
    elt.className = ITEM_CLASS + (className ? " " + className : "");
    return elt;
  },

  // Returns the top-level menu that contains item or item if it is top-level.
  _topLevelItem: function Popup__topLevelItem(item) {
    let popup = this;
    let topLevelItem = item;
    while (popup.parentPopup) {
      topLevelItem = popup.parentMenu;
      popup = popup.parentPopup;
    }
    return topLevelItem;
  }
};


// A subclass of Popup, this represents a window's context menu popup.  It's
// responsible for hiding and showing items according to the window's current
// context.
function ContextMenuPopup(popupElt, window) {
  const self = this;
  Popup.call(this, null, null, popupElt, window);

  // Adds an array of items to the popup.
  this.addItems = function CMP_addItems(items) {
    // Don't do anything if there are no items.
    if (items.length) {
      ensureStaticEltsExist();
      ensureListeningForPopups();

      // Add each item to the top-level menu and the overflow submenu.
      let submenuPopup = overflowPopup();
      for (let i = 0; i < items.length; i++) {
        let item = items[i];
        let wrapper = {
          item: item,
          elt: this._makeItemElt(item, TOPLEVEL_ITEM_CLASS),
          overflowElt: this._makeItemElt(item, OVERFLOW_ITEM_CLASS)
        };
        this.itemWrappers.push(wrapper);

        let targetElt = insertionPoint(item.label, topLevelElts());
        this.popupElt.insertBefore(wrapper.elt, targetElt);

        targetElt = insertionPoint(item.label, overflowElts());
        submenuPopup.insertBefore(wrapper.overflowElt, targetElt);
      }
    }
  };

  // Undoes all modifications to the popup.  The popup should not be used
  // afterward.
  this.destroy = function CMP_destroy() {
    // Remove all the items registered with this instance of the module from the
    // top-level menu and overflow submenu.
    let submenuPopup = overflowPopup();
    for (let i = 0; i < this.itemWrappers.length; i++) {
      this.popupElt.removeChild(this.itemWrappers[i].elt);
      if (submenuPopup)
        submenuPopup.removeChild(this.itemWrappers[i].overflowElt);
    }

    // If there are no more items from any instance of the module, remove the
    // separator and overflow submenu, if they exist.
    let elts = topLevelElts();
    if (!elts.length) {
      let submenu = overflowMenu();
      if (submenu)
        this.popupElt.removeChild(submenu);

      let sep = separator();
      if (sep)
        this.popupElt.removeChild(sep);
    }

    // Remove event listeners.
    if (this._listeningForPopups) {
      this.popupElt.removeEventListener("popupshowing", this, false);
      delete this._listeningForPopups;
    }
    this.__proto__.destroy.call(this);
  };

  // The context menu popup needs to handle popupshowing in addition to command
  // events.  popupshowing is used to show top-level items that match the
  // window's current context and hide items that don't.  Each module instance
  // is responsible for showing and hiding the items it owns.
  this.handleEvent = function CMP_handleEvent(event) {
    if (event.type === "command") {
      this.__proto__.handleEvent.call(this, event);
    }
    else if (event.type === "popupshowing") {
      try {
        // Show and hide items.  Set a "jetpackContextCurrent" property on the
        // DOM elements to signal which of our items match the current context.
        this.itemWrappers.forEach(function (wrapper) {
          let contextCurr = window.isAnyContextCurrent(wrapper.item);
          wrapper.elt.jetpackContextCurrent = contextCurr;
          wrapper.overflowElt.jetpackContextCurrent = contextCurr;
          wrapper.elt.hidden = !contextCurr;
          wrapper.overflowElt.hidden = !contextCurr;
        });

        // Get the total number of items that match the current context.  It's a
        // little tricky:  There may be other instances of this module loaded,
        // each hiding and showing their items.  So we can't base this number on
        // only our items, or on the hidden state of items.  That's why we set
        // the jetpackContextCurrent property above.  The last instance to run
        // will leave the menupopup in the correct state.
        let elts = topLevelElts();
        let numShown = Array.reduce(elts, function (total, elt) {
          return total + (elt.jetpackContextCurrent ? 1 : 0);
        }, 0);

        // If too many items are shown, show the submenu and hide the top-level
        // items.  Otherwise, hide the submenu and show the top-level items.
        let overflow = numShown > overflowThreshold();
        if (overflow)
          Array.forEach(elts, function (e) e.hidden = true);

        let submenu = overflowMenu();
        if (submenu)
          submenu.hidden = !overflow;

        // If no items are shown, hide the menu separator.
        let sep = separator();
        if (sep)
          sep.hidden = numShown === 0;
      }
      catch (err) {
        console.exception(err);
      }
    }
  };

  // Removes an array of items from the popup.
  this.removeItems = function CMP_removeItems(items) {
    let overPopup = overflowPopup();
    for (let i = 0; i < items.length; i++) {
      let idx = indexOfItemWrapper(items[i]);
      if (idx < 0) {
        // Don't throw here; continue the loop.
        let err = new Error("Internal error: item for removal not found.");
        console.exception(err);
      }

      let wrapper = this.itemWrappers[idx];
      this.popupElt.removeChild(wrapper.elt);
      overPopup.removeChild(wrapper.overflowElt);
      this.itemWrappers.splice(idx, 1);
    }
  };

  // Returns true if the DOM element is owned by the wrapper.
  this._eltMatchesItemWrapper = function CMP__eltMatchesWrap(elt, itemWrapper) {
    return elt == itemWrapper.elt || elt == itemWrapper.overflowElt;
  };

  // Adds the popupshowing listener if it hasn't been added already.
  function ensureListeningForPopups() {
    if (!self._listeningForPopups) {
      self.popupElt.addEventListener("popupshowing", self, false);
      self._listeningForPopups = true;
    }
  }

  // Adds the menu separator and overflow submenu if they don't exist.
  function ensureStaticEltsExist() {
    let sep = separator();
    if (!sep) {
      sep = makeSeparator();
      self.popupElt.appendChild(sep);
    }

    let submenu = overflowMenu();
    if (!submenu) {
      submenu = makeOverflowMenu();
      self.popupElt.insertBefore(submenu, sep.nextSibling);
    }
  }

  // Returns the index of the item wrapper containing item, -1 if none.
  function indexOfItemWrapper(item) {
    for (let i = 0; i < self.itemWrappers.length; i++) {
      if (self.itemWrappers[i].item === item)
        return i;
    }
    return -1;
  }

  // Creates and returns the <menu> that's shown when too many items are added
  // to the popup.
  function makeOverflowMenu() {
    let submenu = self.doc.createElement("menu");
    submenu.id = OVERFLOW_MENU_ID;
    submenu.setAttribute("label", OVERFLOW_MENU_LABEL);
    let popup = self.doc.createElement("menupopup");
    popup.id = OVERFLOW_POPUP_ID;
    submenu.appendChild(popup);
    return submenu;
  }

  // Creates and returns the <menuseparator> that separates the standard context
  // menu items from our items.
  function makeSeparator() {
    let elt = self.doc.createElement("menuseparator");
    elt.id = SEPARATOR_ID;
    return elt;
  }

  // Returns the item elements contained in the overflow menu, a NodeList.
  function overflowElts() {
    return overflowPopup().getElementsByClassName(OVERFLOW_ITEM_CLASS);
  }

  // Returns the overflow <menu>.
  function overflowMenu() {
    return self.doc.getElementById(OVERFLOW_MENU_ID);
  }

  // Returns the overflow <menupopup>.
  function overflowPopup() {
    return self.doc.getElementById(OVERFLOW_POPUP_ID);
  }

  // Returns the OVERFLOW_THRESH_PREF pref value if it exists or
  // OVERFLOW_THRESH_DEFAULT if it doesn't.
  function overflowThreshold() {
    let prefs = require("preferences-service");
    return prefs.get(OVERFLOW_THRESH_PREF, OVERFLOW_THRESH_DEFAULT);
  }

  // Returns the <menuseparator>.
  function separator() {
    return self.doc.getElementById(SEPARATOR_ID);
  }

  // Returns the item elements contained in the top-level menu, a NodeList.
  function topLevelElts() {
    return self.popupElt.getElementsByClassName(TOPLEVEL_ITEM_CLASS);
  }
};

ContextMenuPopup.prototype = Popup.prototype;


// Init the browserManager only after setting prototypes and such above, because
// it will cause browserManager.onTrack to be called immediately if there are
// open windows.
browserManager.init();
