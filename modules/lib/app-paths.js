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
 * The Original Code is chromless.
 *
 * The Initial Developer of the Original Code is
 *   Lloyd Hilaiel <lloyd@mozilla.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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

/**
 * Returns various paths that are pertinent to the currently running
 * application and logged in user.
 */

const {Cc,Ci,Cr} = require("chrome");
const path = require('path');

var dirsvc = Cc["@mozilla.org/file/directory_service;1"]
             .getService(Ci.nsIProperties);

/**
 * The currently active *profile*, which is a user specific directory where
 * user scoped application data may reside, such as preferences and history.
 *
 * @type string
 */
exports.profileDir = dirsvc.get("ProfD", Ci.nsIFile).path;

/**
 * The path where the *browser code* of the application resides on disk.
 * For an installed application this usually be nested inside of a system wide installation path.
 * This path should be expected to be read-only.
 * @type string
 */
exports.browserCodeDir = path.join(dirsvc.get("DefRt", Ci.nsIFile).parent.path, "browser_code");

/**
 * @property startMenuDir
 * On windows, the path to the start menu where shortcuts may be installed.
 * `null` on other platforms.
 * @type string
 */
try {
    // will fail if we're not on windows (no start menu dir)
    exports.startMenuDir = dirsvc.get("Progs", Ci.nsIFile).path;
} catch(e) {
    exports.startMenuDir = null;
}
/**
 * The path to the user's desktop.
 * @type string
 */
exports.desktopDir = dirsvc.get("Desk", Ci.nsIFile).path;

/**
 * The path to the currently logged in user's home directory.
 * @type string
 */
exports.userHomeDir =  dirsvc.get("Home", Ci.nsIFile).path;

/**
 * In chromeless, *profiles* are specially named directories stored
 * in a user scoped location.  Support for multiple profiles is built in at a very
 * low level, and the basic mechanism by which profiles are supported is a two
 * level directory structure.  This property provides the path to the "outer" or
 * "root" profile directory, under which different profiles reside.
 * @type string
 */
exports.profileRootDir =  dirsvc.get("DefProfRt", Ci.nsIFile).path;

/**
 * The path to the directory where web plugins will be loaded for this
 * application.
 * @type string
 */
exports.pluginsDir =  dirsvc.get("APlugns", Ci.nsIFile).path;

/**
 * The current working directory of the chromeless application process.
 * @type string
 */
exports.curDir =  dirsvc.get("CurProcD", Ci.nsIFile).path;

/**
 * The system's temporary directory.
 * @type string
 */
exports.tmpDir =  dirsvc.get("TmpD", Ci.nsIFile).path;

// we don't need this anymore, let the GC do its job (eventually)
dirsvc = null;
