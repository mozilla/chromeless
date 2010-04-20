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
 * Portions created by the Initial Developer are Copyright (C) 2010
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

var errors = require("errors");
var windowUtils = require("window-utils");

// TODO: The hard-coding of app-specific info here isn't very nice;
// ideally such app-specific info should be more decoupled, and the
// module should be extensible, allowing for support of new apps at
// runtime, perhaps by inspecting supported packages (e.g. via
// dynamically-named modules or package-defined extension points).

exports.isAppSupported = function isAppSupported() {
  return require("xul-app").isOneOf(["Firefox"]);
};

var addTab = exports.addTab = function addTab(url, options) {
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
           .getService(Ci.nsIWindowMediator);
  var win = wm.getMostRecentWindow("navigator:browser");
  if (!options)
    options = {};
  if (!win || options.inNewWindow) {
    var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
             .getService(Ci.nsIWindowWatcher);
    var urlStr = Cc["@mozilla.org/supports-string;1"]
                 .createInstance(Ci.nsISupportsString);
    urlStr.data = url;
    ww.openWindow(null, "chrome://browser/content/browser.xul",
                  null, "chrome", urlStr);
  } else {
    var browser = win.document.querySelector("tabbrowser");
    browser.selectedTab = browser.addTab(url);
  }
};

function tabBrowserIterator(window) {
  var browsers = window.document.querySelectorAll("tabbrowser");
  for (var i = 0; i < browsers.length; i++)
    yield browsers[i];
}

var Tracker = exports.Tracker = function Tracker(delegate) {
  this._delegate = delegate;
  this._browsers = [];
  this._windowTracker = new windowUtils.WindowTracker(this);

  require("unload").ensure(this);
};

Tracker.prototype = {
  __iterator__: function __iterator__() {
    for (var i = 0; i < this._browsers.length; i++)
      yield this._browsers[i];
  },
  get: function get(index) {
    return this._browsers[index];
  },
  onTrack: function onTrack(window) {
    for (browser in tabBrowserIterator(window))
      this._browsers.push(browser);
    if (this._delegate)
      for (browser in tabBrowserIterator(window))
        this._delegate.onTrack(browser);
  },
  onUntrack: function onUntrack(window) {
    for (browser in tabBrowserIterator(window)) {
      let index = this._browsers.indexOf(browser);
      if (index != -1)
        this._browsers.splice(index, 1);
      else
        console.error("internal error: browser tab not found");
    }
    if (this._delegate)
      for (browser in tabBrowserIterator(window))
        this._delegate.onUntrack(browser);
  },
  get length() {
    return this._browsers.length;
  },
  unload: function unload() {
    this._windowTracker.unload();
  }
};

exports.whenContentLoaded = function whenContentLoaded(callback) {
  var cb = require("errors").catchAndLog(function eventHandler(event) {
    if (event.target && event.target.defaultView)
      callback(event.target.defaultView);
  });

  var tracker = new Tracker({
    onTrack: function(tabBrowser) {
      tabBrowser.addEventListener("DOMContentLoaded", cb, false);
    },
    onUntrack: function(tabBrowser) {
      tabBrowser.removeEventListener("DOMContentLoaded", cb, false);
    }
  });

  return tracker;
};
