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

const LAB_PROTOCOL = "chromeless";
const LAB_HOST = "main";
const LAB_URL = LAB_PROTOCOL + "://" + LAB_HOST + "/";

// TODO: We want to localize this string.
const LAB_TITLE = "Mozilla Application Kit";

// This is temporary, we are temporaily exposing this to the HTML developer browser, so we can continue to test the tabbrowser element and session store til we figure out and keep things things here in this main app context. Search for Ci, we current expose Ci to the developers HTML browser. 

const {Ci,Cc} = require("chrome");

//var tabBrowser = require("tab-browser");
var simpleFeature = require("simple-feature");

var appWindow = null; 

function injectLabVars(window) {

  /* This may go away - we expose a bunch of things in the developers HTML browser so far and we will revisit this, possibly keep the HTML browser safe and ask que HTML browser developer to message the upper app through a whitelisted require API */ 

  window.wrappedJSObject.packaging = packaging;
  window.wrappedJSObject.require = require;
  window.wrappedJSObject.Ci = Ci;
  window.wrappedJSObject.Cc = Cc;
}

function requireForBrowser( safe_module ) { 
	return require;
} 

exports.main = function main(options) {
  var protocol = require("custom-protocol").register(LAB_PROTOCOL);

  // TODO: Eventually we want to have this protocol not run
  // as the system principal.
  //protocol.setHost(LAB_HOST, packaging.getURLForData("/")); // use this one if you want to prevent the outer browser 
  
  /* We will run the HTML browser page as system protocol. This is a 
     chromeless:// protocol, which can access thre data directory, 
     contents from the ui/yourapp/ directory and notice it uses 
     'system' proviledges, so yes, it now can do anything! */

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

      var call = options.staticArgs;
      console.log("Loading browser using = "+LAB_URL + call.browser);

      /* We have some experimentation trying to launch the main window
      with a transparent background */
      //var contentWindow = require("chromeless-window");
      var contentWindow = require("content-window");

      // check window and inject things directly not with a main window
   
      /* Page window height and width is fixed, it won't be 
      and it also shoudl be smart, so HTML browser developer 
      can change it when they set inner document width and height */

      var window = new contentWindow.Window({url: LAB_URL + call.browser,
                                             width: 800,
                                             height: 600,
                                             onStartLoad: injectLabVars});

      appWindow = window;

    };

  if (simpleFeature.isAppSupported())
    simpleFeature.register(LAB_TITLE, openLab);
  else
    // No other way to allow the user to expose the functionality
    // voluntarily, so just open the lab now.
    openLab();
};

exports.onUnload = function (reason) {
  console.log("Trying to kill app window");
  appWindow.close();
  
};

