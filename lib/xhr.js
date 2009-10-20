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

var requests = [];

const TERMINATE_EVENTS = ["load", "error", "abort"];

const READ_ONLY_PROPS = ["readyState", "responseText", "responseXML",
                         "status", "statusText"];

const DELEGATED_METHODS = ["abort", "getAllResponseHeaders",
                           "getResponseHeader", "overrideMimeType",
                           "send", "sendAsBinary", "setRequestHeader",
                           "open"];

var getRequestCount = exports.getRequestCount = function getRequestCount() {
  return requests.length;
};

var XMLHttpRequest = exports.XMLHttpRequest = function XMLHttpRequest() {
  var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
            .createInstance(Ci.nsIXMLHttpRequest);
  req.mozBackgroundRequest = true;

  this._req = req;
  this._orsc = null;

  requests.push(this);

  var self = this;

  this._boundCleanup = function _boundCleanup() {
    self._cleanup();
  };

  TERMINATE_EVENTS.forEach(
    function(name) {
      self._req.addEventListener(name, self._boundCleanup, false);
    });
};

XMLHttpRequest.prototype = {
  _cleanup: function _cleanup() {
    this.onreadystatechange = null;
    var index = requests.indexOf(this);
    if (index != -1) {
      var self = this;
      TERMINATE_EVENTS.forEach(
        function(name) {
          self._req.removeEventListener(name, self._boundCleanup, false);
        });
      requests.splice(index, 1);
    }
  },
  _unload: function _unload() {
    this._req.abort();
    this._cleanup();
  },
  addEventListener: function addEventListener() {
    throw new Error("not implemented");
  },
  removeEventListener: function removeEventListener() {
    throw new Error("not implemented");
  },
  set upload() {
    throw new Error("not implemented");
  },
  get onreadystatechange() {
    return this._orsc;
  },
  set onreadystatechange(cb) {
    this._orsc = cb;
    if (cb) {
      var self = this;
      this._req.onreadystatechange = function() {
        try {
          self._orsc.apply(self, arguments);
        } catch (e) {
          console.exception(e);
        }
      };
    } else
      this._req.onreadystatechange = null;
  }
};

READ_ONLY_PROPS.forEach(
   function(name) {
     XMLHttpRequest.prototype.__defineGetter__(
       name,
       function() {
         return this._req[name];
       });
   });

DELEGATED_METHODS.forEach(
  function(name) {
    XMLHttpRequest.prototype[name] = function() {
      this._req[name].apply(this._req, arguments);
    };
  });

require("unload").when(
  function() {
    requests.slice().forEach(function(request) { request._unload(); });
  });
