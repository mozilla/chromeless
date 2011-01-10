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

"use strict";

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
 * Takes URI of the page and returns associated favicon URI.
 * If page under passed uri has no favicon then base64 encoded data URI of
 * default faveicon is returned.
 * @param {String} uri
 * @returns {String}
 */
exports.getFaviconURIForLocation = function getFaviconURIForLocation(uri) {
  let pageURI = NetUtil.newURI(uri);
  try {
    return FaviconService.getFaviconDataAsDataURL(
                  FaviconService.getFaviconForPage(pageURI));
  }
  catch(e) {
    if (!DEF_FAVICON) {
      DEF_FAVICON = PNG_B64 +
                    base64Encode(getChromeURIContent(DEF_FAVICON_URI));
    }
    return DEF_FAVICON;
  }
}

/**
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
exports.getChromeURIContent = getChromeURIContent;

/**
 * Creates a base-64 encoded ASCII string from a string of binary data.
 */
function base64Encode(data) AppShellService.hiddenDOMWindow.btoa(String(data));
exports.base64Encode = base64Encode;

/**
 * Decodes a string of data which has been encoded using base-64 encoding.
 */
function base64Decode(data) AppShellService.hiddenDOMWindow.atob(String(data));
exports.base64Decode = base64Decode;
