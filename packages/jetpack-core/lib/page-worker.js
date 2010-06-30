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
 *   Felipe Gomes <felipc@gmail.com> (Original Author)
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
const apiUtils = require("api-utils");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

let hostFrame, hostDocument, hiddenWindow, isHostFrameReady = false;

if (!require("xul-app").isOneOf(["Firefox", "Thunderbird"])) {
  throw new Error([
    "The page-worker module currently supports only Firefox and Thunderbird. ",
    "In the future we would like it to support other applications, however. Please ",
    "see https://bugzilla.mozilla.org/show_bug.cgi?id=546740 for more information."
  ].join(""));
}

let appShellService = Cc["@mozilla.org/appshell/appShellService;1"].
                        getService(Ci.nsIAppShellService);
hiddenWindow = appShellService.hiddenDOMWindow;

if (!hiddenWindow) {
  throw new Error([
    "The page-worker module needs an app that supports a hidden window. ",
    "We would like it to support other applications, however. Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=546740 for more information."
  ].join(""));
}

// Check if we can use the hidden window itself to host our iframes.
// If it's not a suitable host, the hostFrame will be lazily created
// by the first Page Worker instance.
if (hiddenWindow.location.protocol == "chrome:" &&
    (hiddenWindow.document.contentType == "application/vnd.mozilla.xul+xml" ||
     hiddenWindow.document.contentType == "application/xhtml+xml")) {
  hostFrame = hiddenWindow;
  hostDocument = hiddenWindow.document;
  isHostFrameReady = true;
}

function setHostFrameReady() {
  hostDocument = hostFrame.contentDocument;
  hostFrame.removeEventListener("DOMContentLoaded", setHostFrameReady, false);
  isHostFrameReady = true;
}

// This cache is used to access friend properties between functions
// without exposing them on the public API
let pageWorkerCache = [];

function findInCache(pageWorker) {
  for (let i in pageWorkerCache)
    if (pageWorkerCache[i].ref === pageWorker)
      return i;
  return -1;
}

exports.Page = apiUtils.publicConstructor(Page);
/**
 * Creates a background page by adding a <xul:iframe> into the hiddenWindow
 *
 * @params options
 *         If any of the following options are invalid, an error is thrown:
 *         @prop onReady
 *               A function to be called whenever a DOMContentLoaded event
 *               hits the <xul:iframe>. It can be used to know when this
 *               page-worker instance is ready or when the webpage inside
 *               it changed.
 */
function Page(options) {

  options = apiUtils.validateOptions(options, {
    onReady: {
      is: ["undefined", "function", "array"],
      ok: function(v) {
        if (v && v.constructor && v.constructor.name == "Array") {
        // make sure every item is a function
        for each (let item in v) {
            if (typeof(item) !== "function") {
              return false;
            }
          }
        }
        return true;
      },
      msg: "The onReady option must be a function or an array of functions."
    },
    content: {
      is: ["undefined", "string"],
      msg: "The content option must be an string with HTML or an URL."
    },
    allow: { }
  });

  require("collection").addCollectionProperty(this, "onReady");
  
  if (options.onReady) {
    this.onReady = options.onReady;
  }

  options.allow = options.allow || {};
  options.content = options.content || "";

  let self = this;

  function configureAllowScript(newValue) {
    let cacheEntry = findInCache(self);
    // If start-up hasn't finished yet, browser or browser.docShell might be null.
    // The value, however, won't be lost, since the most updated value will be picked
    // during start-up.
    let browser = (cacheEntry != -1) ? pageWorkerCache[cacheEntry].browser() : null;
    if (browser && browser.docShell) {
      browser.docShell.allowJavascript = !!newValue;
    }
  }

  /* Public API: page.allow */
  this.__defineGetter__("allow", function() {
    return {
      get script() {
        return options.allow.script || false;
      },
      set script(newValue) {
        options.allow.script = !!newValue;
        configureAllowScript(newValue);
      }
    }
  });
  this.__defineSetter__("allow", function(newValue) {
    self.allow.script = !!newValue.script;
  });

  /* Public API: page.content */
  this.__defineGetter__("content", function() {
    return options.content || "";
  });
  this.__defineSetter__("content", function(newVal) {
    if (typeof(newVal) !== "string") {
      throw "The content attribute must be an string.";
    }
    options.content = newVal;
    let content = newVal;
    try {
      require("url").URL(content);
    } catch(e) {
      content = "data:text/html," + content;
    }
    let cacheEntry = findInCache(self);
    if (cacheEntry != -1) {
      pageWorkerCache[cacheEntry].ref.window.location.href = content;
    }
  });


  if (!hostFrame) {
    hostFrame = hiddenWindow.document.createElement("iframe");

    // ugly ugly hack. This is the most lightweight chrome:// file I could find on the tree
    // This hack should be removed by proper platform support on bug 565388 
    hostFrame.setAttribute("src", "chrome://global/content/mozilla.xhtml");
    hostFrame.addEventListener("DOMContentLoaded", setHostFrameReady, false);

    hiddenWindow.document.body.appendChild(hostFrame);
  }

}

exports.add = function JP_SDK_Page_Worker_add(pageWorker) {

  if (!(pageWorker instanceof Page)) {
    throw new Error("The object to be added must be a Page Worker instance.");
  }

  if (findInCache(pageWorker) != -1) {
    // this instance was already added
    return pageWorker;
  }

  let [browser, unloadFunction] = startPageWorker(pageWorker);

  let cacheEntry = {
    ref: pageWorker,
    browser: browser,
    unload: unloadFunction
  };

  pageWorkerCache.push(cacheEntry);

  require("unload").ensure(cacheEntry);

  return pageWorker;
}

exports.remove = function JP_SDK_Page_Worker_remove(pageWorker) {

  if (!(pageWorker instanceof Page)) {
    throw new Error("The object to be removed must be a Page Worker instance.");
  }

  let cacheEntry = findInCache(pageWorker);

  if (cacheEntry != -1) {
    pageWorkerCache[cacheEntry].unload();
  }

}


function startPageWorker(self) {

  /* Private members */
  let browser = null;

  /* Private helper function */
  function onReadyListener(event) {
    if (event.target == browser.contentDocument && self.onReady) {
      for each (callback in self.onReady.__iterator__())
        errors.catchAndLog(callback).call(self);
    }
  }

  /* Private constructor */
  function createPageWorkerElement() {
    hostFrame.removeEventListener("DOMContentLoaded", createPageWorkerElement, false);

    browser = hostDocument.createElementNS(XUL_NS, "iframe");
    browser.addEventListener("DOMContentLoaded", onReadyListener, false);

    let content = self.content || "about:blank";

    try {
      require("url").URL(content);
    } catch(e) {
      content = "data:text/html," + content;
    }

    browser.setAttribute("type", "content");
    browser.setAttribute("src", content);

    hostDocument.documentElement.appendChild(browser);

    browser.docShell.allowJavascript = (self.allow && self.allow.script);

    /* Public API: page.window */
    self.__defineGetter__("window", function () browser.contentWindow);

    /* Public API: page.document */
    self.__defineGetter__("document", function () browser.contentDocument);

  }

  /* Begin element construction or schedule it for later */
  if (isHostFrameReady) {
    createPageWorkerElement();
  } else {
    hostFrame.addEventListener("DOMContentLoaded", createPageWorkerElement, false);
  }

   /*
   * Returns the browser reference and the unload function that finalizes this
   *  Page Worker by clearing listeners and elements from this instance.
   */
  return [function() browser, function JP_SDK_Page_Worker_unload() {
    try {
      browser.removeEventListener("DOMContentLoaded", onReadyListener, false);
      hostDocument.documentElement.removeChild(browser);
    } catch (e) { }
    delete self.document;
    delete self.window;
    browser = null;
    let entryPos = findInCache(self);
    if (entryPos != -1)
      pageWorkerCache.splice(entryPos, 1);
  }];

}
