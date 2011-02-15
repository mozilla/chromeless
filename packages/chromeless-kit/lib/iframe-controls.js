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

/** Allows application code to control and inspect iframes */

const {Cc, Ci, Cr} = require("chrome");

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
