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
 *   Lloyd Hilaiel <lloyd@hilaiel.com>
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

const {Cc, Ci, Cr, Cu} = require("chrome");
const events = require("events").EventEmitterTrait;

/**
 * @class ProgressMonitor
 * An object that allows you to attach to iframes containing web content
 * to subscribe to events which provide information about the progress
 * of loading web resources.
 *
 * Example Usage:
 * 
 *     var pm = require('web-content').ProgressMonitor();
 *     pm.attach(document.getElementById("someIFrame");
 *     pm.on('title-change', function(title) {
 *       console.log("Title of loaded content changed: " + title);
 *     };
 */
exports.ProgressMonitor = function() {
  var eventEmitter = events.create();
  var domElem = undefined;
  var aBrowserStatusHandler = undefined;

  return {
    on: function() { return eventEmitter.on.apply(eventEmitter, arguments); },
    once: function() { return eventEmitter.once.apply(eventEmitter, arguments); },
    removeListener: function() { return eventEmitter.removeListener.apply(eventEmitter, arguments); },
    attach: function(de) {
      this.detach();

      // verify that the argument is acutally an iframe element!
      if (typeof de !== "object" || de.contentWindow === undefined) {
        throw "ProgressMonitor.attach() requires an iframe dom node as an argument";
      }
      domElem = de;

      // http://forums.mozillazine.org/viewtopic.php?f=19&t=1084155
      var frameShell = domElem.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
        .getInterface(Ci.nsIWebNavigation)
        .QueryInterface(Ci.nsIDocShell);

      // chrome://global/content/bindings/browser.xml#browser
      var webProgress = frameShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);

      aBrowserStatusHandler = new nsBrowserStatusHandler();
      aBrowserStatusHandler.init(eventEmitter, domElem);
      var filter = Cc["@mozilla.org/appshell/component/browser-status-filter;1"]
        .createInstance(Ci.nsIWebProgress);
      webProgress.addProgressListener(filter,Ci.nsIWebProgress.NOTIFY_ALL);
      filter.addProgressListener(aBrowserStatusHandler, Ci.nsIWebProgress.NOTIFY_ALL);

      // (lth) reference the filter from the dom element that uses it.  This ensures there's a
      // proper reference count on the progress listeners
      domElem.progressListenerFilter = filter;

      /* We need to hook up a service to bind security awareness here, 
       * I am not totally sure about this, but searching in browser
       * implementation was able to find some security UI doc 
       * http://mxr.mozilla.org/mozilla-central/source/toolkit/content/widgets/browser.xml#544
       */
      if(!frameShell.securityUI) { 
        var securityUI = Cc["@mozilla.org/secure_browser_ui;1"]
          .createInstance(Ci.nsISecureBrowserUI);
        securityUI.init(domElem.contentWindow);
      };
    },
    detach: function() {
      if (domElem && domElem.progressListenerFilter) {
        delete domElem.progressListenerFilter;
      }
      domElem = undefined;
      aBrowserStatusHandler = undefined;
    }
  };
};

function nsBrowserStatusHandler() {
}

nsBrowserStatusHandler.prototype =
{
  iframeElement: null,
  lastKnownTitle: null,
  eventEmitter: null,
  lastProgressSent: null,

  QueryInterface : function(aIID)
  {
    if (aIID.equals(Ci.nsIWebProgressListener) ||
        aIID.equals(Ci.nsIXULBrowserWindow) ||
        aIID.equals(Ci.nsISupportsWeakReference) ||
        aIID.equals(Ci.nsISupports))
    {
      return this;
    }
    throw Cr.NS_NOINTERFACE;
  },

  init: function(eventEmitter, iframeElem) {
    this.eventEmitter = eventEmitter;
    this.iframeElem = iframeElem;
  },

  onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
  {
    const wpl = Ci.nsIWebProgressListener;

    // START and WINDOW are the earliest hooks we'll get at the time a request starts
    if (aStateFlags & wpl.STATE_IS_WINDOW) {
      if (aStateFlags & wpl.STATE_START) this.startDocumentLoad(aRequest);
      else if (aStateFlags & wpl.STATE_STOP) this.endDocumentLoad(aRequest, aStatus);
    }

    return;
  },
  onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
  {
    this.checkTitle();
    let curProgress = 100.0 * (aCurTotalProgress / aMaxTotalProgress);
    if (curProgress > this.lastProgressSent) {
      /**
       * @event progress
       * Allows the listener to understand approximately how much of the
       * page has loaded.
       * @payload {number} The percentage (0..100) of page load that is complete
       */
      this.eventEmitter._emit("progress", curProgress);
      this.lastProgressSent = curProgress;
    }
  },
  onLocationChange : function(aWebProgress, aRequest, aLocation)
  {
  },
  onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage)
  {
    /**
     * @event status-changed
     * Provides human readable textual strings which contain load status
     * @payload {string} A description of status of the page load.
     */
    this.eventEmitter._emit("status-changed", aMessage);
  },
  onSecurityChange : function(aWebProgress, aRequest, aState)
  {
    var detail = {};

    [
      [Ci.nsIWebProgressListener.STATE_IS_INSECURE, "insecure"],
      [Ci.nsIWebProgressListener.STATE_IS_BROKEN, "broken"],
      [Ci.nsIWebProgressListener.STATE_IS_SECURE, "secure"]
    ].forEach(function(x) {
        if (aState & x[0]) detail.state = x[1];
    });

    [
      [Ci.nsIWebProgressListener.STATE_SECURE_HIGH, "high"],
      [Ci.nsIWebProgressListener.STATE_SECURE_MED, "med"],
      [Ci.nsIWebProgressListener.STATE_SECURE_LOW, "low"]
    ].forEach(function(x) {
        if (aState & x[0]) detail.strength = x[1];
    });
    /**
     * @event security-change
     * An event raised during load which emits a JavaScript object
     * containing the "security state" of the page: `.state` is one of
     * *`insecure`*, *`broken`*, or *`secure`* (get [more
     * info](https://developer.mozilla.org/en/nsIWebProgressListener#State_Security_Flags)
     * on states), while `.strength` is *`.low`*, *`.medium`*, or
     * *`high`* ( [read
     * more](https://developer.mozilla.org/en/nsIWebProgressListener#Security_Strength_Flags)
     * about *strengths*).
     * @payload {object}
     */
    this.eventEmitter._emit("security-change", detail);
  },
  startDocumentLoad : function(aRequest)
  {
    this.checkTitle();
    /**
     * @event load-start
     * Dispatched when navigation starts.  This event is delivered before any
     * network interaction takes place.
     * @payload {string} The url of web content to be loaded.
     */
    this.eventEmitter._emit("load-start", aRequest.name);
    this.eventEmitter._emit("progress", 0.0);
    this.lastProgressSent = 0;
  },
  endDocumentLoad : function(aRequest, aStatus)
  {
    this.checkTitle();
    if (this.lastProgressSent != 100) {
      this.lastProgressSent = 100;
      // documented above
      this.eventEmitter._emit("progress", 100.0);
    }
    /**
     * @event load-stop
     * An event raised upon completion of a top level document
     * load.  Fired after all resources have been loaded, or if the load has been
     * programmatically stopped.
     */
    this.eventEmitter._emit("load-stop");
  },
  checkTitle: function() {
    let title = this.iframeElem.contentDocument.title;
    if (typeof title === 'string' && title !== this.lastKnownTitle) {
      this.lastKnownTitle = title;
      /**
       * @event title-changed
       * Dispatched when the title of web content changes during load.
       * @payload {string} The new title of the web content.
       */
      this.eventEmitter._emit("title-change", title);
    }
  },
  setJSStatus : function(status)
  {
  },
  setJSDefaultStatus : function(status)
  {
  },
  setDefaultStatus : function(status)
  {
  },
  setOverLink : function(link, b)
  {
  }
}
/** @endclass */

/**
 * stop the loading of content within an iframe 
 * @params {IFrameNode} frame An iframe dom node.
 */
exports.stopload = function(frame) { 
  var webNav= frame.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation);
  webNav.stop(webNav.STOP_ALL);
};

/**
 * Access the title of an iframe.  
 * @params {IFrameNode} frame An iframe dom node.
 * @returns {string} The current title of the content in the iframe.
 */
exports.title = function(frame) {
  return frame.contentDocument.title;
};

/**
 * Access the scrollTop an iframe.  
 * @params {IFrameNode} frame An iframe dom node.
 * @returns {number} The current offset in pixels of the scrolling in the iframe.
 */
exports.scrollTop = function(frame) {
  return frame.contentWindow.scrollY;
};

/**
 * inject a function into a web content window
 * @params {IFrameNode} frame An iframe dom node.
 * @params {string} attachPoint the property of `window.` to which this function shall be
 * attached.
 * @params {function} callback The function that will be invoked when content in the
 * iframe invokes this function.
 */
exports.inject = function(frame, attach, func) {
  frame.contentWindow.wrappedJSObject[attach] = func;
};
