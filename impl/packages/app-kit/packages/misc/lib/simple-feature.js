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

var errors = require("errors");
var windowUtils = require("window-utils");

// TODO: The hard-coding of app-specific info here isn't very nice;
// ideally such app-specific info should be more decoupled, and the
// module should be extensible, allowing for support of new apps at
// runtime, perhaps by inspecting supported packages (e.g. via
// dynamically-named modules or package-defined extension points).

// According to mxr, this selector should exist on at least
// Firefox, Thunderbird, and Sunbird:
// http://mxr.mozilla.org/mozilla/search?string=devToolsSeparator
var DEFAULT_MENU_ITEM_SELECTOR = "menubar #devToolsSeparator";

exports.isAppSupported = function isAppSupported() {
  return require("xul-app").isOneOf(["Firefox", "Thunderbird", "Sunbird"]);
};

var tryAddMenuItem = exports.tryAddMenuItem = function(document, label, cb) {
  var sep = document.querySelector(DEFAULT_MENU_ITEM_SELECTOR);

  if (sep && sep.parentNode) {
    var item = document.createElement("menuitem");
    item.setAttribute("label", label);
    item.addEventListener("command", errors.catchAndLog(cb), false);
    sep.parentNode.insertBefore(item, sep);
    return item;
  }
  return null;
};

exports.register = function register(name, callback) {
  return new SimpleFeature(name, callback);
};

var SimpleFeature = exports.SimpleFeature = function SimpleFeature(name,
                                                                   callback) {
  this.name = name;
  this.callback = callback;
  this._docs = [];
  this._items = [];
  this._windowTracker = new windowUtils.WindowTracker(this);
  require("unload").ensure(this);
};

SimpleFeature.prototype = {
  onTrack: function onTrack(window) {
    var item = tryAddMenuItem(window.document, this.name, this.callback);
    if (item) {
      this._docs.push(window.document);
      this._items.push(item);
    }
  },

  onUntrack: function onUntrack(window) {
    var index = this._docs.indexOf(window.document);
    if (index != -1) {
      var item = this._items.splice(index, 1)[0];
      this._docs.splice(index, 1);
      if (item.parentNode)
        item.parentNode.removeChild(item);
    }
  },

  unload: function unload() {
    this._windowTracker.unload();
  }
};
