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
 * Portions created by the Initial Developer are Copyright (C) 2007
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Atul Varma <atul@mozilla.com>
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
 * A URL parsing library and some utility routines to convert between native
 * paths.  Includes a class representation of URLs that may be used in
 * many other modules.
 */

const {Cc,Ci,Cr} = require("chrome");

var ios = Cc['@mozilla.org/network/io-service;1']
          .getService(Ci.nsIIOService);

var resProt = ios.getProtocolHandler("resource")
              .QueryInterface(Ci.nsIResProtocolHandler);

function newURI(uriStr, base) {
  try {
    let baseURI = base ? ios.newURI(base, null, null) : null;
    return ios.newURI(uriStr, null, baseURI);
  }
  catch (e if e.result == Cr.NS_ERROR_MALFORMED_URI) {
    throw new Error("malformed URI: " + uriStr);
  }
  catch (e if (e.result == Cr.NS_ERROR_FAILURE ||
               e.result == Cr.NS_ERROR_ILLEGAL_VALUE)) {
    throw new Error("invalid URI: " + uriStr);
  }
}

function resolveResourceURI(uri) {
  var resolved;
  try {
    resolved = resProt.resolveURI(uri);
  } catch (e if e.result == Cr.NS_ERROR_NOT_AVAILABLE) {
    throw new Error("resource does not exist: " + uri.spec);
  };
  return resolved;
}

/**
 * given a string (typically the result of human input), attempt to
 * guess the well formed URL intended.  For instanced, this function
 * will turn `mozilla.com` into `http://mozilla.com`
 * @param {string} fragment A url fragment
 * @returns {string} A guess at a well formed url.
 */
exports.guess = function(fragment) {
  var fixupSvc = Cc["@mozilla.org/docshell/urifixup;1"].getService(Ci.nsIURIFixup);
  return fixupSvc.createFixupURI(fragment,0).spec;;
};

/**
 * build a URL from a filename.
 * @param {string} path The path to convert.
 * @returns {string}
 * A string representation of a URL.
 */
let fromFilename = exports.fromFilename = function fromFilename(path) {
  var file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
  file.initWithPath(path);
  return ios.newFileURI(file).spec;
};

/**
 * build a filename from a url.
 * @param {string} path The path to convert.
 * @returns {string}
 * A string representation of a URL.
 */
let toFilename = exports.toFilename = function toFilename(url) {
  var uri = newURI(url);
  if (uri.scheme == "resource")
    uri = newURI(resolveResourceURI(uri));
  if (uri.scheme == "chrome") {
    var channel = ios.newChannelFromURI(uri);
    try {
      channel = channel.QueryInterface(Ci.nsIFileChannel);
      return channel.file.path;
    } catch (e if e.result == Cr.NS_NOINTERFACE) {
      throw new Error("chrome url isn't on filesystem: " + url);
    }
  }
  if (uri.scheme == "file") {
    var file = uri.QueryInterface(Ci.nsIFileURL).file;
    return file.path;
  }
  throw new Error("cannot map to filename: " + url);
};

/**
 * @class URL
 * A class which parses a url and exposes its various
 * components separately.
 */

/**
 * @constructor
 *
 * The URL constructor creates an object that represents a URL,  verifying that
 * the provided string is a valid URL in the process.
 *
 * @param {string} url A string to be converted into a URL.
 * @param {string} [base] An optional base url which will be used to resolve the
 * `url` argument if it is a relative url.
 *
 * @throws If `source` is not a valid URI.
 */
function URL(url, base) {
  var uri = newURI(url, base);

  var userPass = null;
  try {
    userPass = uri.userPass ? uri.userPass : null;
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {}

  var host = null;
  try {
    host = uri.host;
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {}

  var port = null;
  try {
    port = uri.port == -1 ? null : uri.port;
  } catch (e if e.result == Cr.NS_ERROR_FAILURE) {}


  /**
   * @property {string} scheme
   * The name of the protocol in the URL.
   */
  this.__defineGetter__("scheme", function() uri.scheme);
  /**
   * @property {string} userPass
   * The username:password part of the URL, `null` if not present.
   */
  this.__defineGetter__("userPass", function() userPass);
  /**
   * @property {string} host
   * The host of the URL, `null` if not present.
   */
  this.__defineGetter__("host", function() host);
  /**
   * @property {integer} port
   * The port number of the URL, `null` if none was specified.
   */
  this.__defineGetter__("port", function() port);
  /**
   * @property {string} path
   * The path component of the URL.
   */
  this.__defineGetter__("path", function() uri.path);
  /**
   * @function toString
   * Converts URL class contents to a string.
   * @returns {string} The URL as a string.
   */
  this.toString = function URL_toString() uri.spec;
};
/** @endclass */

exports.URL = require("api-utils").publicConstructor(URL);
