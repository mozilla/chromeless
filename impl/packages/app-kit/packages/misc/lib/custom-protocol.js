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

let {Cc, Ci, Cr} = require("chrome");

var xpcom = require("xpcom");

var Protocol = exports.Protocol = function Protocol(name) {
  memory.track(this);

  var self = this;
  var contractID = "@mozilla.org/network/protocol;1?name=" + name;
  var ios = Cc["@mozilla.org/network/io-service;1"]
            .getService(Ci.nsIIOService);
  var hosts = {};

  try {
    xpcom.getClass(contractID);
    throw new Error("protocol already registered: " + name);
  } catch (e if e.result == Cr.NS_ERROR_FACTORY_NOT_REGISTERED) {}

  self.unload = function unload() {
    try {
      handler.unregister();
    } catch (e if /factory already unregistered/.test(e)) {}
    handler = null;
  };

  self.setHost = function setHost(host, url, principal) {
    var info = {base: ios.newURI(url, null, null)};

    if (!principal) {
      var secman = Cc["@mozilla.org/scriptsecuritymanager;1"]
                   .getService(Ci.nsIScriptSecurityManager);

      principal = secman.getCodebasePrincipal(info.base);
    } else if (principal == "system") {
      principal = Cc["@mozilla.org/systemprincipal;1"]
                  .createInstance(Ci.nsIPrincipal);
    }

    if (!(principal instanceof Ci.nsIPrincipal))
      throw new Error("invalid principal: " + principal);

    info.principal = principal;
    hosts[host] = info;
  };

  function ProtocolHandler() {
    memory.track(this);
  }

  ProtocolHandler.prototype = {
    get scheme() {
      return name;
    },
    get protocolFlags() {
      // For more information on what these flags mean,
      // see caps/src/nsScriptSecurityManager.cpp.
      return (Ci.nsIProtocolHandler.URI_STD |
              Ci.nsIProtocolHandler.URI_IS_LOCAL_RESOURCE |
              Ci.nsIProtocolHandler.URI_DANGEROUS_TO_LOAD);
    },
    get defaultPort() {
      return -1;
    },
    allowPort: function allowPort() {
      return false;
    },
    newURI: function newURI(spec, charset, baseURI) {
      var uri = Cc["@mozilla.org/network/standard-url;1"]
                .createInstance(Ci.nsIStandardURL);
      uri.init(uri.URLTYPE_STANDARD, -1, spec, charset, baseURI);
      uri.mutable = false;
      return uri;
    },
    newChannel: function newChannel(URI) {
      if (URI.host in hosts) {
        var resolved;
        var path = URI.path.slice(1);
        if (path)
          resolved = ios.newURI(path, null, hosts[URI.host].base);
        else
          resolved = hosts[URI.host].base;

        var channel = ios.newChannelFromURI(resolved);

        channel.originalURI= URI;
        channel.owner = hosts[URI.host].principal;
        return channel;
      }
      throw Cr.NS_ERROR_FILE_NOT_FOUND;
    },
    QueryInterface: xpcom.utils.generateQI([Ci.nsISupports,
                                            Ci.nsISupportsWeakReference,
                                            Ci.nsIProtocolHandler])
  };

  var handler = xpcom.register({name: "Custom Protocol: " + name,
                                contractID: contractID,
                                create: ProtocolHandler});

  require("unload").ensure(this);
};

exports.register = function register(name) {
  return new Protocol(name);
};
