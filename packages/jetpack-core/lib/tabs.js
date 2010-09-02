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
 *   Dietrich Ayala <dietrich@mozilla.com> (Original author)
 *   Felipe Gomes <felipc@gmail.com>
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

if (!require("xul-app").is("Firefox")) {
  throw new Error([
    "The tabs module currently supports only Firefox.  In the future ",
    "we would like it to support other applications, however.  Please see ",
    "https://bugzilla.mozilla.org/show_bug.cgi?id=560716 for more information."
  ].join(""));
}

const tabBrowser = require("tab-browser");
const TabModule = tabBrowser.TabModule;

let tabModule = new TabModule();

exports.__defineGetter__("activeTab", function() tabModule.activeTab);
exports.__defineSetter__("activeTab", function(tab) tabModule.activeTab = tab);

exports.open = tabModule.open;
exports.__iterator__ = tabModule.__iterator__;
exports.__defineGetter__("length", function() tabModule.length);

tabBrowser.tabEvents.forEach(function(eventHandler) {
  // return the collection for each event
  exports.__defineGetter__(eventHandler, function() tabModule[eventHandler]);

  // make tabs setter for each event, for adding via property assignment
  exports.__defineSetter__(eventHandler, function(val) tabModule[eventHandler].add(val));
});

function unload() {
  // Unregister tabs event listeners
  tabBrowser.tabEvents.forEach(function(e) exports[e] = []);
}
require("unload").ensure(this);
