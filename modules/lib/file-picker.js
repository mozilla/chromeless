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
 * The Original Code is Chromeless.
 *
 * Contributor(s):
 *   Panagiotis Astithas <pastith@gmail.com>
 *   Lloyd Hilaiel <lloyd@mozilla.com>
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
 * A module that allows you to render various dialogs to allow the user to select
 * file(s) or directories.
 *
 * **Example Usage:**
 *
 *     // Allocate a file picker
 *     const filePicker = require('file-picker');
 *     var fp = filePicker.FilePicker();
 *
 *     // Set the dialog title and selection mode
 *     fp.title = "Hi!  Pick some files!"
 *     fp.mode = "multiple";
 *
 *     // Show the dialog and process the result!
 *     fp.show(function(x) {
 *         if (x === undefined) {
 *             console.log("user selected nothing!  (canceled dialog)");
 *         } else {
 *             console.log("you picked " + x.length + " files");
 *             for (var i = 0; i < x.length; i++)
 *                 console.log("  " + i + ": " + x[i]);
 *         }
 *     });
 */

const {Cc, Ci, Cr} = require("chrome"),
       ui = require("ui"),
       mainWin = require("window-utils");

/**
 * @class FilePicker
 * A class which allows you to open native "file picker" dialogs to allow
 * the user to select files or folders.
 */

/**
 * @constructor
 * @param {string} [title] The title of the dialog
 * @param {string} [mode] The mode of the dialog
 * @throws if invalid mode is set
 */
function FilePicker(title, mode) {
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

    /**
     * The title of the dialog
     * @type {string}
     */
    this.title = title ? title : "Select a file";

    /**
     * The mode of the dialog.  Possible values include:
     *
     *  + `open` to allow for the selection of a single file
     *  + `save` to show a dialog designed to select a save location for a file
     *  + `folder` to allow for the selection of a folder/directory
     *  + `multiple` to allow the user to select multiple files
     *
     * @throws if invalid mode is set
     * @type {string}
     */
    this.__defineSetter__("mode", function (m) {
        switch (m) {
        case "save":
            this._mode = Ci.nsIFilePicker.modeSave;
            break;
        case "folder":
            this._mode = Ci.nsIFilePicker.modeGetFolder;
            break;
        case "multiple":
            this._mode = Ci.nsIFilePicker.modeOpenMultiple;
            break;
        case "open":
            this._mode = Ci.nsIFilePicker.modeOpen;
            break;
        default:
            throw "invalid mode for FilePicker: " + mode;
        }
    });
    this.__defineGetter__("mode", function () { return this._mode; });

    if (mode) this.mode = mode;

    /**
     * Show the file picker dialog.
     * @param {function} callback
     * A callback that will be invoked once the user makes a selection.  Will
     * be passed `undefined` if nothing is selected
     */
    this.show = function(cb) {
        fp.init(mainWin.activeWindow, this.title, this.mode);
        fp.appendFilters(Ci.nsIFilePicker.filterAll | Ci.nsIFilePicker.filterText);
        var rv = fp.show();
        if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {
            if (this.mode == Ci.nsIFilePicker.modeOpenMultiple) {
                var files = fp.files;
                var paths = [];
                while (files.hasMoreElements()) {
                    var path = files.getNext().QueryInterface(Ci.nsILocalFile).path;
                    paths.push(path);
                }
                cb(paths);
            } else {
                cb(fp.file.path);
            }
        } else {
            cb(undefined);
        }
    };
}
/** @endclass */

exports.FilePicker = require("api-utils").publicConstructor(FilePicker);
