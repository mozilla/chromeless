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
 *   Eric H. Jung <eric.jung@yahoo.com>
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
    "The selection module currently supports only Firefox.  In the future ",
    "we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=560716 for more information."
  ].join(""));
}

let {Ci} = require("chrome");

// The selection type HTML
const HTML = 0x01;

// The selection type TEXT
const TEXT = 0x02;

// The selection type DOM (internal use only)
const DOM  = 0x03;

/**
 * Creates an object from which a selection can be set, get, etc. Each
 * object has an associated with a range number. Range numbers are the
 * 0-indexed counter of selection ranges as explained at
 * https://developer.mozilla.org/en/DOM/Selection.
 *
 * @param rangeNumber
 *        The zero-based range index into the selection
 */
function Selection(rangeNumber) {

  // In order to hide the private rangeNumber argument from API consumers while
  // still enabling Selection getters/setters to access it, the getters/setters
  // are defined as lexical closures in the Selector constructor.

  this.__defineGetter__("text", function () getSelection(TEXT, rangeNumber));
  this.__defineSetter__("text", function (str) setSelection(str, rangeNumber));

  this.__defineGetter__("html", function () getSelection(HTML, rangeNumber));
  this.__defineSetter__("html", function (str) setSelection(str, rangeNumber));

  this.__defineGetter__("contiguous", function () {
    let sel = getSelection(DOM, rangeNumber);
    // It isn't enough to check that rangeCount is zero. If one or more ranges
    // are selected and then unselected, rangeCount is set to one, not zero.
    // Therefore, if rangeCount is one, we also check if the selection is
    // collapsed.
    if (sel.rangeCount == 0)
      return null;
    if (sel.rangeCount == 1) {
      let range = safeGetRange(sel, 0);
      return range && range.collapsed ? null : true;
    }
    return false;
  });
}

require("xpcom").utils.defineLazyServiceGetter(this, "windowMediator",
  "@mozilla.org/appshell/window-mediator;1", "nsIWindowMediator");

/**
 * Returns the most recent content window
 */
function context() {
  // Overlay names should probably go into the xul-app module instead of here
  return windowMediator.getMostRecentWindow("navigator:browser").document.
    commandDispatcher.focusedWindow;
}

/**
 * Returns the current selection from most recent content window. Depending on
 * the specified |type|, the value returned can be a string of text, stringified
 * HTML, or a DOM selection object as described at
 * https://developer.mozilla.org/en/DOM/Selection.
 *
 * @param type
 *        Specifies the return type of the selection. Valid values are the one
 *        of the constants HTML, TEXT, or DOM.
 *
 * @param rangeNumber
 *        Specifies the zero-based range index of the returned selection.
 */
function getSelection(type, rangeNumber) {
  let window, selection;
  try {
    window = context();
    selection = window.getSelection();
  }
  catch (e) {
    return null;
  }

  // Get the selected content as the specified type
  if (type == DOM)
    return selection;
  else if (type == TEXT) {
    let range = safeGetRange(selection, rangeNumber);
    return range ? range.toString() : null;
  }
  else if (type == HTML) {
    let range = safeGetRange(selection, rangeNumber);
    // Another way, but this includes the xmlns attribute for all elements in
    // Gecko 1.9.2+ :
    // return Cc["@mozilla.org/xmlextras/xmlserializer;1"].
    //   createInstance(Ci.nsIDOMSerializer).serializeToSTring(range.
    //     cloneContents());
    if (!range)
      return null;
    let node = window.document.createElement("span");
    node.appendChild(range.cloneContents());
    return node.innerHTML;
  }
  throw new Error("Type " + type + " is unrecognized.");
}

/**
 * Returns the specified range in a selection without throwing an exception.
 *
 * @param selection
 *        A selection object as described at
 *         https://developer.mozilla.org/en/DOM/Selection
 *
 * @param rangeNumber
 *        Specifies the zero-based range index of the returned selection.
 */
function safeGetRange(selection, rangeNumber) {
  try {
    let range = selection.getRangeAt(rangeNumber);
    if (!range || range.toString() == "")
      return null;
    return range;
  }
  catch (e) {
    return null;
  }
}

/**
 * Sets the current selection of the most recent content document by changing
 * the existing selected text/HTML range to the specified value.
 *
 * @param val
 *        The value for the new selection
 *
 * @param rangeNumber
 *        The zero-based range index of the selection to be set
 *
 */
function setSelection(val, rangeNumber) {
    // Make sure we have a window context & that there is a current selection.
    // Selection cannot be set unless there is an existing selection.
    let window, range;
    try {
      window = context();
      range = window.getSelection().getRangeAt(rangeNumber);
    }
    catch (e) {
      // Rethrow with a more developer-friendly message than the caught
      // exception.
      throw new Error("It isn't possible to change the selection, as there isn't currently a selection");
    }
    // Get rid of the current selection and insert our own
    range.deleteContents();
    let node = window.document.createElement("span");
    range.surroundContents(node);

    // Some relevant JEP-111 requirements:

    // Setting the text property replaces the selection with the value to
    // which the property is set and sets the html property to the same value
    // to which the text property is being set.

    // Setting the html property replaces the selection with the value to
    // which the property is set and sets the text property to the text version
    // of the HTML value.

    // This sets both the HTML and text properties.
    node.innerHTML = val;
}

function onLoad(event) {
  SelectionListenerManager.onLoad(event);
}

function onUnload(event) {
  SelectionListenerManager.onUnload(event);
}

let SelectionListenerManager = {
  QueryInterface: require("xpcom").utils.generateQI([Ci.nsISelectionListener]),

  // The collection of listeners wanting to be notified of selection changes
  listeners: [],

  /**
   * This is the nsISelectionListener implementation. This function is called
   * by Gecko when a selection is changed interactively.
   *
   * We only pay attention to the SELECTALL, KEYPRESS, and MOUSEUP selection
   * reasons. All reasons are listed here:
   *
   * http://mxr.mozilla.org/mozilla1.9.2/source/content/base/public/
   *   nsISelectionListener.idl
   *
   * The other reasons (NO_REASON, DRAG_REASON, MOUSEDOWN_REASON) aren't
   * applicable to us.
   */
  notifySelectionChanged: function notifySelectionChanged(document, selection,
                                                          reason) {
    if (!["SELECTALL", "KEYPRESS", "MOUSEUP"].some(function(type) reason &
      Ci.nsISelectionListener[type + "_REASON"]) || selection.toString() == "")
        return;

    // Notify each listener immediately but don't block on them.
    this.listeners.forEach(function(listener) {
      require("timer").setTimeout(function() {
        // Catch exceptions so that other listeners, if any, are still called.
        require("errors").catchAndLog(function() listener.call(exports))();
      }, 0);
    });
  },

  /**
   * Part of the Tracker implementation. This function is called by the
   * tabs module when a browser is being tracked. Often, that means a new tab
   * has been opened, but it can also mean an addon has been installed while
   * tabs are already opened. In that case, this function is called for those
   * already-opened tabs.
   *
   * @param browser
   *        The browser being tracked
   */
  onTrack: function onTrack(browser) {
    browser.addEventListener("load", onLoad, true);
    browser.addEventListener("unload", onUnload, true);
  },

  onLoad: function onLoad(event) {
    // Nothing to do without a useful window
    let window = event.target.defaultView;
    if (!window)
      return;

    // Wrap the add selection call with some number of setTimeout 0 because some
    // reason it's possible to add a selection listener "too early". 2 sometimes
    // works for gmail, and more consistently with 3, so make it 5 to be safe.
    let count = 0;
    let self = this;
    function wrap(count, func) {
      if (count-- > 0)
        require("timer").setTimeout(wrap, 0);
      else
        self.addSelectionListener(window);
    }
    wrap();
  },

  addSelectionListener: function addSelectionListener(window) {
    if (window.jetpack_core_selection_listener)
      return;
    let selection = window.getSelection();
    if (selection instanceof Ci.nsISelectionPrivate)
      selection.addSelectionListener(this);
    window.jetpack_core_selection_listener = true;
  },

  onUnload: function onUnload(event) {
    // Nothing to do without a useful window
    let window = event.target.defaultView;
    if (!window)
      return;
    this.removeSelectionListener(window);
  },

  removeSelectionListener: function removeSelectionListener(window) {
    if (!window.jetpack_core_selection_listener)
      return;
    let selection = window.getSelection();
    if (selection instanceof Ci.nsISelectionPrivate)
      selection.removeSelectionListener(this);
    window.jetpack_core_selection_listener = false;
  },

  /**
   * Part of the TabTracker implementation. This function is called by the
   * tabs module when a browser is being untracked. Usually, that means a tab
   * has been closed.
   *
   * @param browser
   *        The browser being untracked
   */
  onUntrack: function onUntrack(browser) {
    browser.removeEventListener("load", onLoad, true);
    browser.removeEventListener("unload", onUnload, true);
  }
};

/**
 * Install |SelectionListenerManager| as tab tracker in order to watch
 * tab opening/closing
 */
require("tab-browser").Tracker(SelectionListenerManager);

/**
 * Exports an iterator so that discontiguous selections can be iterated.
 */
exports.__iterator__ = function __iterator__() {
  for (let i = 0, sel = getSelection(DOM); i < sel.rangeCount; i++)
    yield new Selection(i);
};

/**
 * Exports the |onSelect| collection property, using
 * |SelectionListenerManager.listeners| as the backing array.
 */
require("collection").addCollectionProperty(exports, "onSelect",
  SelectionListenerManager.listeners);

// Export the Selection singleton. Its rangeNumber is always zero.
Selection.call(exports, 0);

