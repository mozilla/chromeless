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

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

function quit() {
  var appStartup = Cc['@mozilla.org/toolkit/app-startup;1'].
                   getService(Ci.nsIAppStartup);

  appStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
}

window.addEventListener(
  "load",
  function() {
    function runTests(log, assert) {
      var prints = [];
      function print(message) {
        prints.push(message);
      }

      var loader = new Cuddlefish.Loader({rootPath: "lib/",
                                          print: print,
                                          SecurableModule: SecurableModule});
      log("loader instantiates", "pass");

      loader.runScript("console.log('testing', 1, [2, 3, 4])");
      assert.isEqual(prints[0], "info: testing 1 2,3,4\n",
                     "console.log() must work.");

      loader.runScript("console.info('testing', 1, [2, 3, 4])");
      assert.isEqual(prints[1], "info: testing 1 2,3,4\n",
                     "console.info() must work.");

      loader.runScript("console.warn('testing', 1, [2, 3, 4])");
      assert.isEqual(prints[2], "warning: testing 1 2,3,4\n",
                     "console.warn() must work.");

      loader.runScript("console.error('testing', 1, [2, 3, 4])");
      assert.isEqual(prints[3], "error: testing 1 2,3,4\n",
                     "console.error() must work.");
    }
    DumpTestRunner.run(runTests);
    quit();
  },
  false
);
