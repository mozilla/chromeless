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
 *   Myk Melez <myk@mozilla.org> (Original Author)
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
    "The panel module currently supports only Firefox.  In the future ",
    "we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=jetpack-panel-apps ",
    "for more information."
  ].join(""));
}

const {Ci} = require("chrome");
const apiUtils = require("api-utils");
const xpcom = require("xpcom");
const collection = require("collection");
const hiddenFrames = require("hidden-frame");
const errors = require("errors");
const contentSymbionts = require("content-symbiont");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;

xpcom.utils.defineLazyServiceGetter(this,
                                    "windowMediator",
                                    "@mozilla.org/appshell/window-mediator;1",
                                    "nsIWindowMediator");

function coerceToURL(content) {
  if (!content)
    return "about:blank";

  try {
    url.URL(content);
  }
  catch(ex) {
    content = "data:text/html," + content;
  }

  return content;
}

exports.Panel = apiUtils.publicConstructor(Panel);

function Panel(options) {
  options = options || {};
  let self = this;

  contentSymbionts.mixInto(this, options);

  // We define these independently of the main validateOptions call so we can
  // reuse them when checking values passed to the setters after construction.
  let widthReq = {
    is: ["number", "undefined"]
  };
  let heightReq = {
    is: ["number", "undefined"]
  };
  let contentReq = {
    is: ["undefined", "string"],
    msg: "The content option must be a string of HTML or a URL."
  };
  let onShowReq = {
    is: ["undefined", "function", "array"],
    ok: function(v) {
      if (apiUtils.getTypeOf(v) === "array") {
        // make sure every item is a function
        return v.every(function (item) typeof(item) === "function")
      }
      return true;
    }
  };
  let onHideReq = {
    is: ["undefined", "function", "array"],
    ok: function(v) {
      if (apiUtils.getTypeOf(v) === "array") {
        // make sure every item is a function
        return v.every(function (item) typeof(item) === "function")
      }
      return true;
    }
  };

  // Validate panel-specific options without filtering those validated by
  // contentSymbionts.mixInto.
  for each (let [key, val] in Iterator(apiUtils.validateOptions(options,
                              { width: widthReq, height: heightReq,
                                content: contentReq, onShow: onShowReq,
                                onHide: onHideReq }))) {
    if (typeof(val) != "undefined")
      options[key] = val;
  };

  /* Public API: panel.content */
  this.__defineGetter__("content", function () options.content || undefined);
  this.__defineSetter__("content", function (newValue) {
    options.content = apiUtils.validateOptions({ content: newValue },
                                               { content: contentReq }).
                      content;
    let entry = cache.filter(function (v) v.panel === self)[0];
    if (entry)
      entry.hiddenFrame.element.setAttribute("src", coerceToURL(newValue));
  });

  /* Public API: panel.allow */
  options.allow = options.allow || {};
  this.__defineGetter__("allow", function () {
    return {
      get script() {
        if ("allow" in options && "script" in options.allow)
          return options.allow.script;
        return true;
      },
      set script(newValue) {
        options.allow.script = !!newValue;
          let entry = cache.filter(function (v) v.panel === self)[0];
          if (entry)
            entry.hiddenFrame.element.docShell.allowJavascript = !!newValue;
      }
    }
  });
  this.__defineSetter__("allow", function (newValue) {
    if ("script" in newValue)
      self.allow.script = !!newValue.script;
  });

  /* Public API: panel.width */
  this.__defineGetter__("width", function () options.width || undefined);
  this.__defineSetter__("width", function (val) {
    options.width =
      apiUtils.validateOptions({ width: val }, { width: widthReq }).width;
  });

  /* Public API: panel.height */
  this.__defineGetter__("height", function () options.height || undefined);
  this.__defineSetter__("height", function (val) {
    options.height =
      apiUtils.validateOptions({ height: val }, { height: heightReq }).height;
  });

  /* Public API: panel.onShow */
  require("collection").addCollectionProperty(this, "onShow");
  if (options.onShow)
    this.onShow.add(options.onShow);

  /* Public API: panel.onHide */
  require("collection").addCollectionProperty(this, "onHide");
  if (options.onHide)
    this.onHide.add(options.onHide);

  /* Public API: panel.show() */
  this.show = function show(anchor) {
    let entry = cache.filter(function (v) v.panel === self)[0];
    if (entry)
      entry.show.call(this, anchor);
    else
      throw new Error("You have to add the panel via require('panel').add() " +
                      "before you can show it.")
  };

  /* Public API: panel.hide() */
  this.hide = function hide() {
    let entry = cache.filter(function (v) v.panel === self)[0];
    if (entry)
      entry.hide.call(this);
    else
      throw new Error("You have to add the panel via require('panel').add() " +
                      "before you can hide it.")
  };

  /* Public API: panel.sendMessage() */
  this.sendMessage = function sendMessage(message, callback) {
    let entry = cache.filter(function (v) v.panel === self)[0];
    if (entry)
      entry.sendMessage(message, callback);
    else
      throw new Error("You have to add the panel via require('panel').add() " +
                      "before you can send a message to it.");
  };

  this.toString = function toString() "[object Panel]";
}

let cache = [];

/* Public API: add() */
exports.add = function add(panel) {
  if (!(panel instanceof Panel))
    throw new Error("The object to be added must be a Panel.");

  if (cache.some(function (v) v.panel === panel))
    return panel;

  // The object that evaluates script provided by the consumer in a context
  // that has access to the context of the content loaded in the panel.
  let contentSymbiont;

  let contentReady = false;
  let callOnContentReady;

  // The hidden frame into which we load the content in preparation for showing
  // it when the consumer calls panel.show().  We load it into a hidden frame
  // in advance so the content is immediately available the moment it is shown.
  // Hidden frames aren't immediately available on Windows and Linux, however,
  // so we have to wait for it to be ready before creating the content symbiont.
  let hiddenFrame = hiddenFrames.add(hiddenFrames.HiddenFrame({
    onReady: function() {
      contentSymbiont = contentSymbionts.ContentSymbiont({
        frame: this.element,
        contentScriptURL: [c for (c in panel.contentScriptURL)],
        contentScript: [c for (c in panel.contentScript)],
        contentScriptWhen: panel.contentScriptWhen,
        onMessage: function onMessage(message, cb) {
          for (let handler in panel.onMessage) {
            errors.catchAndLog(function () handler.call(panel, message, cb))();
          }
        },
        globalName: "panel"
      });
      this.element.docShell.allowJavascript = panel.allow.script;

      function onContentReady() {
        hiddenFrame.element.removeEventListener("DOMContentLoaded",
                                                onContentReady, true);
        contentReady = true;

        if (callOnContentReady)
          callOnContentReady();
      }
      this.element.addEventListener("DOMContentLoaded", onContentReady, true,
                                  true);

      this.element.setAttribute("src", panel.content);
    }
  }));

  // While the panel is visible, this is the XUL <panel> we use to display it.
  // Otherwise, it's undefined or null.
  let xulPanel;

  /* Public API: panel.sendMessage() */
  function sendMessage(message, callback) {
    return contentSymbiont.sendMessage(message, callback);
  }

  /* Public API: panel.show() */
  function show(anchor) {
    let document = getWindow(anchor).document;
    xulPanel = document.createElementNS(XUL_NS, "panel");
    document.getElementById("mainPopupSet").appendChild(xulPanel);

    let iframe = document.createElementNS(XUL_NS, "iframe");
    iframe.setAttribute("type", "content");
    iframe.setAttribute("flex", "1");
    iframe.setAttribute("transparent", "transparent");

    let width = panel.width || DEFAULT_WIDTH;
    let height = panel.height || DEFAULT_HEIGHT;

    if (anchor) {
      // Open the popup by the anchor.
      // TODO: make the XUL panel an arrow panel so it gets positioned
      // automagically once arrow panels are implemented in bug 554937.
      xulPanel.openPopup(anchor, "before_start");
    }
    else {
      // Open the popup in the middle of the window.
      let x = document.documentElement.clientWidth / 2 - width / 2;
      let y = document.documentElement.clientHeight / 2 - height / 2;
      xulPanel.openPopup(null, null, x, y);
    }

    xulPanel.sizeTo(width, height);

    // Once the initial about:blank load has hit DOMContentLoaded
    // for the iframe in the panel, and the hidden frame is ready, we're able
    // to swap their frame loaders, i.e. move the content of the panel
    // from the hidden frame where it is stored to the iframe in the XUL panel
    // where it lives while the panel is visible.
    function swapFrameLoaders() {
      iframe.removeEventListener("DOMContentLoaded", swapFrameLoaders, false);

      function reallySwapFrameLoaders() {
        // If the panel was removed while we were waiting for stuff to be ready,
        // return early, since there's no point showing the panel anymore.
        if (!entry.show)
          return;

        callOnContentReady = null;
        iframe.QueryInterface(Ci.nsIFrameLoaderOwner).
               swapFrameLoaders(hiddenFrame.element);
        iframe.docShell.allowJavascript = panel.allow.script;
        contentSymbiont.frame = iframe;

        // Notify consumers that the panel has been shown.
        for (let handler in panel.onShow)
          errors.catchAndLog(function () handler.call(panel))();
      }

      if (contentReady)
        reallySwapFrameLoaders();
      else
        callOnContentReady = reallySwapFrameLoaders;
    }
    iframe.addEventListener("DOMContentLoaded", swapFrameLoaders, false);

    // When the XUL panel becomes hidden, we swap frame loaders to move
    // the content of the panel back to the hidden iframe where it is stored.
    function popupHidden() {
      xulPanel.removeEventListener("popuphidden", popupHidden, false);
      hiddenFrame.element.QueryInterface(Ci.nsIFrameLoaderOwner).
                  swapFrameLoaders(iframe);
      contentSymbiont.frame = hiddenFrame.element;
      xulPanel.parentNode.removeChild(xulPanel);
      xulPanel = null;

      // Notify consumers that the panel has been hidden.
      for (let handler in panel.onHide)
        errors.catchAndLog(function () handler.call(panel))();
    }
    xulPanel.addEventListener("popuphidden", popupHidden, false);

    xulPanel.appendChild(iframe);
  }

  /* Public API: panel.hide() */
  function hide() {
    // The popuphiding handler takes care of swapping back the frame loaders
    // and removing the XUL panel from the application window, we just have to
    // trigger it by hiding the popup.
    // XXX Sometimes I get "TypeError: xulPanel.hidePopup is not a function"
    // when quitting the host application while a panel is visible.  To suppress
    // them, this now checks for "hidePopup" in xulPanel before calling it.
    // It's not clear if there's an actual issue or the error is just normal.
    if (xulPanel && "hidePopup" in xulPanel)
      xulPanel.hidePopup();
  }

  function unload() {
    let entry = cache.filter(function (v) v.panel === panel)[0];
    if (entry)
      panel.hide();
    exports.remove(panel);
  }

  let entry = {
    panel: panel,
    hiddenFrame: hiddenFrame,
    sendMessage: sendMessage,
    show: show,
    hide: hide,
    unload: unload
  };
  cache.push(entry);
  require("unload").ensure(entry);

  return panel;
}

/* Public API: remove() */
exports.remove = function remove(panel) {
  if (!(panel instanceof Panel))
    throw new Error("The object to be removed must be a Panel.");

  let entry = cache.filter(function (v) v.panel === panel)[0];
  if (!entry)
    return;

  hiddenFrames.remove(entry.hiddenFrame);
  entry.panel = null;
  entry.show = null;
  cache.splice(cache.indexOf(entry), 1);
}

function getWindow(anchor) {
  let window;

  if (anchor) {
    let anchorWindow = anchor.ownerDocument.defaultView.top;
    let anchorDocument = anchorWindow.document;

    let enumerator = windowMediator.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements()) {
      let enumWindow = enumerator.getNext();

      // Check if the anchor is in this browser window.
      if (enumWindow == anchorWindow) {
        window = anchorWindow;
        break;
      }

      // Check if the anchor is in a browser tab in this browser window.
      let browser = enumWindow.gBrowser.getBrowserForDocument(anchorDocument);
      if (browser) {
        window = enumWindow;
        break;
      }

      // Look in other subdocuments (sidebar, etc.)?
    }
  }

  // If we didn't find the anchor's window (or we have no anchor),
  // return the most recent browser window.
  if (!window)
    window = windowMediator.getMostRecentWindow("navigator:browser");

  return window;
}
