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

const LAB_PROTOCOL = "app-kit";
const LAB_HOST = "main";
const LAB_URL = LAB_PROTOCOL + "://" + LAB_HOST + "/index.html";

// TODO: We want to localize this string.
const LAB_TITLE = "Mozilla Application Kit";

//var tabBrowser = require("tab-browser");
var simpleFeature = require("simple-feature");

function injectLabVars(window) {
  window.wrappedJSObject.packaging = packaging;
}

exports.main = function main(options) {
  var protocol = require("custom-protocol").register(LAB_PROTOCOL);

  // TODO: Eventually we want to have this protocol not run
  // as the system principal.
  protocol.setHost(LAB_HOST, packaging.getURLForData("/"), "system");

  var openLab;

  if (require("xul-app").is("Firefox")) {
    tabBrowser.whenContentLoaded(function(window) {
      if (window.location == LAB_URL) {
      injectLabVars(window);
      require("window-utils").closeOnUnload(window);
      }
    });
    openLab = function openLabInTab() {
      tabBrowser.addTab(LAB_URL);
    };
  } else
    openLab = function openLabInWindow() {
      var contentWindow = require("content-window");
      var window = new contentWindow.Window({url: LAB_URL,
                                             width: 800,
                                             height: 600,
                                             onStartLoad: injectLabVars});
    };

  if (simpleFeature.isAppSupported())
    simpleFeature.register(LAB_TITLE, openLab);
  else
    // No other way to allow the user to expose the functionality
    // voluntarily, so just open the lab now.
    openLab();
};
