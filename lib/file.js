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
 * The Original Code is nsINarwhal.
 *
 * The Initial Developer of the Original Code is
 * Irakli Gozalishvili <rfobic@gmail.com>.
 * Portions created by the Initial Developer are Copyright (C) 2009
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Irakli Gozalishvili <rfobic@gmail.com>
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

   var exports = {};

   var dirsvc = Cc["@mozilla.org/file/directory_service;1"]
                .getService(Ci.nsIProperties);

   function MozFile(path) {
     var file = Cc['@mozilla.org/file/local;1']
                .createInstance(Ci.nsILocalFile);
     file.initWithPath(path);
     return {
       get directoryEntries() {
         try {
           return file.directoryEntries;
         } catch (e if e.result == Cr.NS_ERROR_FILE_NOT_FOUND) {
           throw new Error("path does not exist: " + file.path);
         }
       },
       __proto__: file
     };
   }

   exports.join = function join(base) {
     if (arguments.length < 2)
       throw new Error("need at least 2 args");
     base = MozFile(base);
     for (var i = 1; i < arguments.length; i++)
       base.append(arguments[i]);
     return base.path;
   };

   exports.dirname = function dirname(path) {
     return MozFile(path).parent.path;
   };

   exports.list = function list(path) {
     var entries = MozFile(path).directoryEntries;
     var entryNames = [];
     while(entries.hasMoreElements()) {
       var entry = entries.getNext();
       entry.QueryInterface(Ci.nsIFile);
       entryNames.push(entry.leafName);
     }
     return entryNames;
   };

   if (global.window) {
     // We're being loaded in a chrome window, or a web page with
     // UniversalXPConnect privileges.
     global.File = exports;
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
