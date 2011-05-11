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
 *   Irakli Gozalishvili <gozala@mozilla.com> (Original Author)
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

/**
 * Tools for accessing favicons, which use a local cache to minimize
 * network requests
 */

"use strict";

const xhr = require('xhr');
const url = require('url');
const timer = require('timer');

const { Cc, Ci, Cu } = require("chrome");
const IOService = Cc["@mozilla.org/network/io-service;1"].
  getService(Ci.nsIIOService);
const AppShellService = Cc["@mozilla.org/appshell/appShellService;1"].
  getService(Ci.nsIAppShellService);

Cu.import("resource://gre/modules/NetUtil.jsm", this);
const FaviconService = Cc["@mozilla.org/browser/favicon-service;1"].
  getService(Ci.nsIFaviconService);

const PNG_B64 = "data:image/png;base64,";
const DEF_FAVICON_URI = "chrome://mozapps/skin/places/defaultFavicon.png";
let   DEF_FAVICON = null;

/**
 * Given the URI of a page, query the local cache for a
 * favicon.
 * @param {string} uri The URI of the page for which a favicon is desired.
 * @returns {string}
 * The favicon as a data URL.  If no such favicon is in the cache,
 * null is returned.
 */
exports.getCached = function getCached(uri) {
  let pageURI = NetUtil.newURI(uri);
  try {
    return FaviconService.getFaviconDataAsDataURL(
      FaviconService.getFaviconForPage(pageURI));
  }
  catch(e) {
    return null;
  }
}

/**
 * Get a default favicon image.
 * @returns {string}
 * A data URL containing a default favicon image
 */
exports.getDefault = function getDefault() {
  if (!DEF_FAVICON) {
    DEF_FAVICON = PNG_B64 +
      base64Encode(getChromeURIContent(DEF_FAVICON_URI));
  }
  return DEF_FAVICON;
};

/**
 * Fetch the favicon for a particular page.  This function will return
 * the favicon from the cache if available, but otherwise will issue a
 * network request to attempt to fetch a site's favicon.
 *
 * @param {string} uri
 *   The page for which a favicon will be fetched.
 * @param {function} cb A callback that will be invoked once the fetch is
 *   complete.  Will be passed a single string argument which is a data url
 *   containing the favicon requested.  If the icon couldn't be fetched or
 *   is not available, a default will be returned.
 */
exports.fetch = function(uri, cb) {
  var returnIcon = function() {
    let icon = exports.getCached(uri);
    if (icon === null) icon = exports.getDefault();
    cb(icon);
  };

  if (exports.getCached(uri)) {
    // force async return
    timer.setTimeout(returnIcon, 0);
  } else {
    var pageURI = NetUtil.newURI(uri);

    // formulate the favicon URI
    let faviconURL = null;
    {
      let purl = url.URL(uri);
      faviconURL = purl.scheme + "://";
      if (purl.userPass) faviconURL += purl.userPass + "@";
      faviconURL += purl.host;
      if (purl.port) faviconURL += ":" + purl.port;
      faviconURL += "/favicon.ico";
    }
    var faviconURI = NetUtil.newURI(faviconURL);

    FaviconService.setAndLoadFaviconForPage(
      pageURI, faviconURI, false,
      function(aURI, aDataLen, aData, aMimeType) {
        returnIcon();
      });
  }
};


/*
 * Takes chrome URI and returns content under that URI.
 * @param {String} chromeURI
 * @returns {String}
 */
function getChromeURIContent(chromeURI) {
  let channel = IOService.newChannel(chromeURI, null, null);
  let input = channel.open();
  let stream = Cc["@mozilla.org/binaryinputstream;1"].
                createInstance(Ci.nsIBinaryInputStream); 
  stream.setInputStream(input);
  let content = stream.readBytes(input.available());
  stream.close();
  input.close();
  return content;
}

/*
 * Creates a base-64 encoded ASCII string from a string of binary data.
 */
function base64Encode(data) AppShellService.hiddenDOMWindow.btoa(String(data));

/*
 * Decodes a string of data which has been encoded using base-64 encoding.
 */
function base64Decode(data) AppShellService.hiddenDOMWindow.atob(String(data));
