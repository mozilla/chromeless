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
      this.eventEmitter._emit("progress", curProgress);
      this.lastProgressSent = curProgress;
    }
  },
  onLocationChange : function(aWebProgress, aRequest, aLocation)
  {
  },
  onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage)
  {
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
    this.eventEmitter._emit("security-change", detail);
  },
  startDocumentLoad : function(aRequest)
  {
    this.checkTitle();
    this.eventEmitter._emit("load-start", aRequest.name);
    this.eventEmitter._emit("progress", 0.0);
    this.lastProgressSent = 0;
  },
  endDocumentLoad : function(aRequest, aStatus)
  {
    this.checkTitle();
    if (this.lastProgressSent != 100) {
      this.lastProgressSent = 100;
      this.eventEmitter._emit("progress", 100.0);
    }
    this.eventEmitter._emit("load-stop");
  },
  checkTitle: function() {
    let title = this.iframeElem.contentDocument.title;
    if (typeof title === 'string' && title !== this.lastKnownTitle) {
      this.lastKnownTitle = title;
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
