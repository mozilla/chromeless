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
 * The Original Code is Jetpack SDK.
 *
 * The Initial Developer of the Original Code is
 * Atul Varma <atul@mozilla.com>.
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

var print;

var {Cc,Ci} = require("chrome");
var xhr = require("xhr");

// TODO: Eventually we should be able to e.g. require("os").environ
// rather than access this XPCOM service directly.
var environ = Cc["@mozilla.org/process/environment;1"]
              .getService(Ci.nsIEnvironment);

function runTask(options) {
  require("bootstrap").run(options, packaging.root.path, print);
  processNextTask();
}

function processNextTask() {
  var req = new xhr.XMLHttpRequest();
  var port = environ.get("JETPACK_DEV_SERVER_PORT");
  var url = "http://localhost:" + port + "/api/task-queue/get";
  req.open("GET", url);
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      if (req.status == 200) {
        if (req.responseText) {
          runTask(JSON.parse(req.responseText));
        } else
          processNextTask();
      } else {
        require("timer").setTimeout(processNextTask, 1000);
      }
    }
  };
  req.send(null);
}

function makeMainWindow(quit) {
  var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
           .getService(Ci.nsIWindowWatcher);
  var text = "Now in development mode. Close this window to exit.";
  var window = ww.openWindow(null, "data:text/plain," + encodeURI(text),
                             "development-mode", "centerscreen", null);

  window.addEventListener("close", function() quit("OK"), false);
}

exports.main = function(options, callbacks) {
  var appInfo = Cc["@mozilla.org/xre/app-info;1"]
                .getService(Ci.nsIXULAppInfo);

  print = callbacks.print;
  if (appInfo.ID == "xulapp@toolness.com")
    // We're running barebones XULRunner, open a default window.
    makeMainWindow(callbacks.quit);
  console.log("Starting.");
  processNextTask();
};
