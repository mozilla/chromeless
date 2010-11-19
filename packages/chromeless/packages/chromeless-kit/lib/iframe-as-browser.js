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

observers = require("observer-service");

observers.add("content-document-global-created", function(subject, url) {
    //if ( byWindow[subject.window] ) {
    for( frameKey in byElements ) { 
            // generate a custom event to indicate to top level HTML
        try { 
        if(subject.window == byElements[frameKey].iframeElement.contentWindow) { 

            // that the initial page load is complete (no scripts yet exectued)
            var evt = byElements[frameKey].refDocument.createEvent("HTMLEvents");
            evt.initEvent("experimental-dom-load", true, false);
            evt.url = subject.window.location.href;
            subject.window.dispatchEvent(evt);
        }
 
        } catch(i) { console.log(i) } 
    } 
});

const {Cc, Ci, Cr} = require("chrome");

const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";
const XHTML_NS ="http://www.w3.org/1999/xhtml";

var byWindow  = new Array();
var byElements = new Array();

/* The reason we need the parentDoc is because we need to dispatch 
   HTMLevents to the iframe, and in order to create the HTMLevents's   
   event, we need to use a document where the event target element
   is contained. See further line: 

     var evt = this.parentDocument.createEvent("HTMLEvents");

   This normally would be okay using iframeRef.parent, however, 
   if you check in chromeless-sandbox-window.js, you will see that 
   we have hacked the inner iframes, at document loading time, 
   and we make them all iframe.parent = iframe.self.  
*/

exports.bind = function enhanceIframe(frame, parentDoc) {
  // we keep track of this in case we need to clean things up
  byElements[frame]= { iframeElement:frame, refDocument: parentDoc }; 
 // byWindow[frame.contentWindow]= { iframeElement:frame, refDocument: parentDoc }; 

  var window = frame.contentWindow;
  // http://forums.mozillazine.org/viewtopic.php?f=19&t=1084155 
  var frameShell = frame.contentWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIWebNavigation)
                     .QueryInterface(Ci.nsIDocShell);
  // chrome://global/content/bindings/browser.xml#browser
  var webProgress = frameShell.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebProgress);
  gBrowserStatusHandler = new nsBrowserStatusHandler();
  gBrowserStatusHandler.init(frame, parentDoc);
  var filter = Cc["@mozilla.org/appshell/component/browser-status-filter;1"]
          .createInstance(Ci.nsIWebProgress);

  webProgress.addProgressListener(filter,Ci.nsIWebProgress.NOTIFY_ALL);
  filter.addProgressListener(gBrowserStatusHandler, Ci.nsIWebProgress.NOTIFY_ALL);
}

function nsBrowserStatusHandler() {
}

nsBrowserStatusHandler.prototype =
{
  iframeElement: null, 
  parentDocument: null, 

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
  },
  

  destroy : function()
  {
  },

  onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
  {
    if (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK)
    {
      if (aStateFlags & Ci.nsIWebProgressListener.STATE_START)
      {
                if(aRequest && aWebProgress.DOMWindow == this.iframeElement.contentWindow) {
                         this.startDocumentLoad(aRequest);
                }
        return;
      }
      if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP)
      {
        if (aRequest) {
            if (aWebProgress.DOMWindow == this.iframeElement.contentWindow) this.endDocumentLoad(aRequest, aStatus);
        }
        return;
      }
      return;
    }


 if (aStateFlags & Ci.nsIWebProgressListener.STATE_IS_DOCUMENT)
    {
      if (aStateFlags & Ci.nsIWebProgressListener.STATE_START)
      {
        return;
      }
      if (aStateFlags & Ci.nsIWebProgressListener.STATE_STOP)
      {
        return;
      }
      return;
    }
  },
  onProgressChange : function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
  {
    this.currentTotalProgress = aCurTotalProgress;
    this.maxTotalProgress     = aMaxTotalProgress;
    var percentage = parseInt((aCurTotalProgress/aMaxTotalProgress)*parseInt(100));
    var evt = this.parentDocument.createEvent("HTMLEvents"); 
    evt.initEvent("experimental-dom-progress", true, false);
    evt.percentage = percentage;
    this.iframeElement.dispatchEvent(evt);
  },
  onLocationChange : function(aWebProgress, aRequest, aLocation)
  {
    console.log("location changed");
/*
      domWindow = aWebProgress.DOMWindow;
      // Update urlbar only if there was a load on the root docshell
      if (domWindow == domWindow.top) {
      }
*/
  },
  onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage)
  {
  },
  startDocumentLoad : function(aRequest)
  {
        var evt = this.parentDocument.createEvent("HTMLEvents"); 
        evt.initEvent("experimental-dom-start", true, false);
        this.iframeElement.dispatchEvent(evt);
  },
  endDocumentLoad : function(aRequest, aStatus)
  {
        var evt = this.parentDocument.createEvent("HTMLEvents"); 
        evt.initEvent("experimental-dom-stop", true, false);
        this.iframeElement.dispatchEvent(evt);
  },
  onSecurityChange : function(aWebProgress, aRequest, aState)
  {
    switch (aState) {
     case Ci.nsIWebProgressListener.STATE_IS_SECURE | Ci.nsIWebProgressListener.STATE_SECURE_HIGH:
        var evt = this.parentDocument.createEvent("HTMLEvents"); 
        evt.initEvent("experimental-dom-security", true, false);
        evt.detail='high';
        this.iframeElement.dispatchEvent(evt);
     break;  
     case Ci.nsIWebProgressListener.STATE_IS_SECURE | Ci.nsIWebProgressListener.STATE_SECURE_LOW:
        var evt = this.parentDocument.createEvent("HTMLEvents"); 
        evt.initEvent("experimental-dom-security", true, false);
        evt.detail='low';
        this.iframeElement.dispatchEvent(evt);
     break;
     case Ci.nsIWebProgressListener.STATE_IS_BROKEN:
        var evt = this.parentDocument.createEvent("HTMLEvents"); 
        evt.initEvent("experimental-dom-security", true, false);
        evt.detail='broken';
        this.iframeElement.dispatchEvent(evt);
     break;
     case Ci.nsIWebProgressListener.STATE_IS_INSECURE:
     default:
        var evt = this.parentDocument.createEvent("HTMLEvents"); 
        evt.initEvent("experimental-dom-security", true, false);
        evt.detail="notavailable";
        this.iframeElement.dispatchEvent(evt);
     break;
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

