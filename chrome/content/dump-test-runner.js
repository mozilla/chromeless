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

(function(global) {
   const Cc = Components.classes;
   const Ci = Components.interfaces;
   const Cu = Components.utils;
   const Cr = Components.results;

   var exports = new Object();

   exports.run = function run(runCallback, print) {
     if (!print)
       print = dump;

     var passed = 0;
     var failed = 0;

     function log(message, label) {
       print(label + ": " + message + "\n");
       switch (label) {
       case "pass":
         passed++;
         break;
       case "fail":
         failed++;
         break;
       case "info":
         break;
       default:
         throw new Exception("Unexpected label: " + label);
       }
     }

     var assert = {
       isEqual: function isEqual(a, b, message) {
         if (a == b) {
           if (!message)
             message = "a == b == " + uneval(a);
           log(message, "pass");
         } else {
           var inequality = uneval(a) + " != " + uneval(b);
           if (!message)
             message = inequality;
           else
             message += " (" + inequality + ")";
           log(message, "fail");
         }
       }
     };

     try {
       runCallback(log, assert);

       print("tests passed: " + passed + "\n");
       print("tests failed: " + failed + "\n");
       if (passed >= 0 && failed == 0)
         print("OK\n");
       else
         print("FAIL\n");
     } catch (e) {
       print("Exception: " + e + " (" + e.fileName +
            ":" + e.lineNumber + ")\n");
       if (e.stack)
         print("Stack:\n" + e.stack);
       print("FAIL\n");
     }
   };

   if (global.window) {
     // We're being loaded in a chrome window, or a web page with
     // UniversalXPConnect privileges.
     global.DumpTestRunner = exports;
   } else if (global.exports) {
     // We're being loaded in a SecurableModule.
     for (name in exports) {
       global.exports[name] = exports[name];
     }
   } else {
     // We're being loaded in a JS module.
     global.EXPORTED_SYMBOLS = [];
     for (name in exports) {
       global.EXPORTED_SYMBOLS.push(name);
       global[name] = exports[name];
     }
   }
 })(this);
