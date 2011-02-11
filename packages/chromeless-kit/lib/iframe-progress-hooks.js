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
 *   Marcio Galli <mgalli@mgalli.com>
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

/** An internal implementation detail.  nothing to see here. */

observers = require("observer-service");

const {Cc, Ci, Cr} = require("chrome");

exports.hookProgress = function(frame, parentDoc) {
  // http://forums.mozillazine.org/viewtopic.php?f=19&t=1084155 
  var frameShell = frame.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIWebNavigation)
                     .QueryInterface(Ci.nsIDocShell);
  // chrome://global/content/bindings/browser.xml#browser
  var webProgress = frameShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);
  var aBrowserStatusHandler = new nsBrowserStatusHandler();
  aBrowserStatusHandler.init(frame, parentDoc);
  var filter = Cc["@mozilla.org/appshell/component/browser-status-filter;1"]
          .createInstance(Ci.nsIWebProgress);

  webProgress.addProgressListener(filter,Ci.nsIWebProgress.NOTIFY_ALL);
  filter.addProgressListener(aBrowserStatusHandler, Ci.nsIWebProgress.NOTIFY_ALL);

  // reference the filter from the dom element that uses it.  This ensures there's a proper
  // reference count on the progress listeners
  frame.progressListenerFilter = filter;

  /* We need to hook up a service to bind security awareness here, 
     I am not totally sure about this, but searching in browser implementation
     was able to find some security UI doc 
     http://mxr.mozilla.org/mozilla-central/source/toolkit/content/widgets/browser.xml#544
  */
  if(!frameShell.securityUI) { 
     var securityUI = Cc["@mozilla.org/secure_browser_ui;1"]
                      .createInstance(Ci.nsISecureBrowserUI);
     securityUI.init(frame.contentWindow);
  }
}

function nsBrowserStatusHandler() {
}

nsBrowserStatusHandler.prototype =
{
  iframeElement: null, 
  parentDocument: null, 
  lastKnownTitle: null,

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

  init : function(tagElementReference, parentDocument)
  {
    /* we know our window here, and we want to be able to inform 
       the updates to the actual tagElementReference, to the iframe 
       HTML element, so the HTML developer's browser can know things
       such as progress updates and so on */
    this.iframeElement = tagElementReference;
    this.parentDocument = parentDocument;

    this.iframeElement.addEventListener("DOMTitleChanged", function (e) {
        console.log("!!!!  title is " + e.target.title);
    }, false);
  },

  destroy : function()
  {
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
    this.currentTotalProgress = aCurTotalProgress;
    this.maxTotalProgress     = aMaxTotalProgress;
    var percentage = parseInt((aCurTotalProgress/aMaxTotalProgress)*parseInt(100));
    var evt = this.parentDocument.createEvent("HTMLEvents"); 
    evt.initEvent("ChromelessLoadProgress", true, false);
    evt.wrappedJSObject.percentage = percentage;
    this.iframeElement.dispatchEvent(evt);
  },
  onLocationChange : function(aWebProgress, aRequest, aLocation)
  {
/*
      domWindow = aWebProgress.DOMWindow;
      // Update urlbar only if there was a load on the root docshell
      if (domWindow == domWindow.top) {
      }
*/
  },
  onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage)
  {
    var evt = this.parentDocument.createEvent("HTMLEvents"); 
    evt.initEvent("ChromelessStatusChanged", true, false);
    evt.wrappedJSObject.message = aMessage;
    this.iframeElement.dispatchEvent(evt);
  },
  onSecurityChange : function(aWebProgress, aRequest, aState)
  {
    var evt = this.parentDocument.createEvent("HTMLEvents"); 
    evt.initEvent("ChromelessSecurityChange", true, false);

    [
      [Ci.nsIWebProgressListener.STATE_IS_INSECURE, "insecure"],
      [Ci.nsIWebProgressListener.STATE_IS_BROKEN, "broken"],
      [Ci.nsIWebProgressListener.STATE_IS_SECURE, "secure"]
    ].forEach(function(x) {
        if (aState & x[0]) evt.wrappedJSObject.state = x[1];
    });

    [
      [Ci.nsIWebProgressListener.STATE_SECURE_HIGH, "high"],
      [Ci.nsIWebProgressListener.STATE_SECURE_MED, "med"],
      [Ci.nsIWebProgressListener.STATE_SECURE_LOW, "low"]
    ].forEach(function(x) {
        if (aState & x[0]) evt.wrappedJSObject.strength = x[1];
    });
    this.iframeElement.dispatchEvent(evt);
  },
  startDocumentLoad : function(aRequest)
  {
    this.checkTitle();
    var evt = this.parentDocument.createEvent("HTMLEvents"); 
    evt.initEvent("ChromelessLoadStart", true, false);
    // The event's data includes the location that is about to be loaded.
    evt.wrappedJSObject.url = aRequest.name;
    this.iframeElement.dispatchEvent(evt);
  },
  endDocumentLoad : function(aRequest, aStatus)
  {
    this.checkTitle();
    var evt = this.parentDocument.createEvent("HTMLEvents"); 
    evt.initEvent("ChromelessLoadStop", true, false);
    this.iframeElement.dispatchEvent(evt);
  },
  checkTitle: function() {
    let title = this.iframeElement.contentDocument.title;
    if (typeof title === 'string' && title !== this.lastKnownTitle) {
      this.lastKnownTitle = title;
      var evt = this.parentDocument.createEvent("HTMLEvents"); 
      evt.initEvent("ChromelessTitleChanged", true, false);
      evt.wrappedJSObject.title = title;
      this.iframeElement.dispatchEvent(evt);
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

