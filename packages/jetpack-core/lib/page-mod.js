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
 * The Original Code is Jetpack Packages.
 *
 * The Initial Developer of the Original Code is Nickolay Ponomarev.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Nickolay Ponomarev <asqueella@gmail.com> (Original Author)
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

const os = require("observer-service");
const apiUtils = require("api-utils");
const unload = require("unload");
const errors = require("errors");
const collection = require("collection");

/**
 * PageMod constructor (exported below).
 * @constructor
 */
var PageMod = function(opts) {
  opts = apiUtils.validateOptions(opts, {
    "include": {
      is: ["array", "string"],
      ok: function(value) {
        try {
          if (typeof value == "string") {
            parseURLRule(value);
          }
          else {
            for each (rule in value)
              parseURLRule(rule);
          }
        }
        catch(ex) {
          return false;
        }
        return true;
      },
      msg: "The page mod must have a string or array 'include' option."
    },
    "onStart": {is: ["function", "array", "null", "undefined"]},
    "onReady": {is: ["function", "array", "null", "undefined"]}
  });

  collection.addCollectionProperty(this, "include");

  // We don't store the parsed versions of the rules, only the raw rules,
  // since the parsed rules are private to this implementation, but there isn't
  // an obvious way to make them available to the code that uses them below.
  //
  // If we were to replace the lexical scope model for hiding private properties
  // with the Traits model for this module, we would be able to fix this.
  this.include = opts.include;

  collection.addCollectionProperty(this, "onStart");
  collection.addCollectionProperty(this, "onReady");

  var self = this;
  function addScripts(opts, key) {
    if (typeof opts[key] == "function") {
      self[key] = [opts[key]];
    } else if (opts[key]) {
      self[key] = opts[key].filter(function(item) {
        if (typeof item != "function") {
          throw new Error("PageMod: an item in the options['" + key +
                          "'] array is not a function: " + item);
        }
        return true;
      });
    }
  }
  addScripts(opts, "onStart");
  addScripts(opts, "onReady");
};

/**
 * A private object keeping the list of active page mods and is registered as
 * an observer for the content-document-global-created notification.
 *
 * Mods are (un)registered via exported add()/remove() functions.
 */
var pageModManager = {
  registeredPageMods: [],

  _initialized: false,
  init: function() {
    this._initialized = true;
    os.add("content-document-global-created", this.onContentGlobalCreated, this);
    unload.when(function() {
      os.remove("content-document-global-created", this.onContentGlobalCreated, this);
    });
  },

  /**
   * Makes the page mod run on any subsequent matching pages loaded in the
   * browser. Does not run the mods on already loaded pages.
   * @param pageMod {PageMod}
   */
  register: function(pageMod) {
    if (!this._initialized) pageModManager.init();
    if (this.registeredPageMods.filter(function(item) item.pageMod === pageMod).length > 0) {
      throw new Error("Trying to add a page mod that has already been added.");
    }
    if (!(pageMod instanceof PageMod)) {
      throw new Error("Trying to add an object that's not a PageMod instance.")
    }
    this.registeredPageMods.push({
      pageMod: pageMod,
      includeRules: [parseURLRule(rule) for each (rule in pageMod.include)]
    });
  },

  /**
   * Removes the page mod from the list of registered mods. This makes the
   * mod to not run on any subsequently loaded pages, but does not undo the
   * mod's effects on already loaded pages.
   */
  unregister: function(pageMod) {
    var index = -1, self = this;
    this.registeredPageMods.forEach(function(item, i) {
      if (self.registeredPageMods[i].pageMod === pageMod)
        index = i;
    });

    if (index == -1) {
      throw new Error("Trying to remove a page mod, that has not been added.");
    }
    this.registeredPageMods.splice(index, 1);
  },

  /**
   * Tests the location against multiple rules and returns |true| when the
   * location matches at least one rule.
   * @param includeRules an array of rules, as returned from parseURLRule()
   * @param location {Location} the location to match the rules against.
   *        https://developer.mozilla.org/En/DOM/Window.location
   */
  _rulesMatchURL: function(includeRules, location) {
    return includeRules.some(function(rule) {
      var result = false;
      if (rule.anyWebPage && location.protocol.match(/^(https?|ftp):$/)) {
        result = true;
      } else if (rule.exactURL && rule.exactURL == location.toString()) {
        result = true;
      } else if (rule.domain) {
        try {
          var host = location.hostname;
          if (host.lastIndexOf(rule.domain) == (host.length - rule.domain.length))
            result = true;
        } catch(err) {/* ignore exceptions, they can happen eg. for 'about:'*/}
      } else if (rule.urlPrefix
                 && location.toString().indexOf(rule.urlPrefix) == 0) {
        result = true;
      }
      //console.debug("    PageMod: rule " + rule.toSource() +
      //              (result ? " matched " : " did not match ") +
      //              "<" + location.toString() + ">");
      return result;
    });
  },

  _runRegisteredCallbacks: function(pageMod, key, wrappedWindow) {
    for each (fn in pageMod[key]) {
      errors.catchAndLog(fn)(wrappedWindow);
    };
  },

  /**
   * A "content-document-global-created" observer notification listener. Runs
   * whenever a new global object is created in content (e.g. new tab opened,
   * navigation [except when a page is loaded from the bfcache], for frames
   * inside a page, blank pages).
   */
  onContentGlobalCreated: function(wrappedWindow, topic, data) {
    var self = this;
    //console.debug("--> PageMod running on page: <" +
    //              wrappedWindow.location.toString() + ">");
    self.registeredPageMods.forEach(function({pageMod, includeRules}) {
      if (self._rulesMatchURL(includeRules, wrappedWindow.location)) {
        if ("onStart" in pageMod) {
          self._runRegisteredCallbacks(pageMod, "onStart", wrappedWindow);
        }
        if ("onReady" in pageMod) {
          function DOMReady(event) {
            wrappedWindow.removeEventListener("DOMContentLoaded", DOMReady, false);
            self._runRegisteredCallbacks(pageMod, "onReady", wrappedWindow);
          }
          wrappedWindow.addEventListener("DOMContentLoaded", DOMReady, false);
        }
      }
    });
    //console.debug("<-- All PageMods finished for page: <" +
    //              wrappedWindow.location.toString() + ">");
  }
};

/**
 * Parses a string, possibly containing the wildcard character ('*') to
 * create URL-matching rule. Supported input strings with the rules they
 * create are listed below:
 *  1) * (a single asterisk) - any URL with the http(s) or ftp scheme
 *  2) *.domain.name - pages from the specified domain and all its subdomains,
 *                     regardless of their scheme.
 *  3) http://example.com/* - any URLs with the specified prefix.
 *  4) http://example.com/test - the single specified URL
 * @param url {string} a string representing a rule that matches URLs
 * @returns {object} a object representing a rule that matches URLs
 */
function parseURLRule(url) {
  var rule;

  var firstWildcardPosition = url.indexOf("*");
  var lastWildcardPosition = url.lastIndexOf("*");
  if (firstWildcardPosition != lastWildcardPosition) {
    throw new Error("There can be at most one '*' character in a wildcard.");
  }
  
  if (firstWildcardPosition == 0) {
    if (url.length == 1)
      rule = { anyWebPage: true };
    else if (url[1] != ".")
      throw new Error("Expected a *.<domain name> string, got: '" + url + "'.");
    else
      rule = { domain: url.substr(2) /* domain */ };
  }
  else {
    if (url.indexOf(":") == -1) {
      throw new Error("When not using *.example.org wildcard, the string " +
                      "supplied is expected to be either an exact URL to " +
                      "match or a URL prefix. The provided string ('" +
                      url + "') is unlikely to match any pages.");
    }

    if (firstWildcardPosition == -1) {
      rule = { exactURL: url };
    }
    else if (firstWildcardPosition == url.length - 1) {
      rule = { urlPrefix: url.substr(0, url.length - 1) };
    }
    else {
      throw new Error("The provided wildcard ('" + url + "') has a '*' in an " +
                      "unexpected position. It is expected to be the first " +
                      "or the last character in the wildcard.");
    }
  }

  return rule;
};


exports.PageMod = apiUtils.publicConstructor(PageMod);
exports.add = function(pageMod) pageModManager.register(pageMod);
exports.remove = function(pageMod) pageModManager.unregister(pageMod);
