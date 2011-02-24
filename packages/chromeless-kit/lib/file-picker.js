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
 * @param {string} title The title of the dialog
 * @param {string} mode The mode of the dialog
 */
function FilePicker(title, mode) {
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

    /**
     * The title of the dialog
     * @type {property}
     */
    this.title = title ? title : "Select a file";

    /**
     * The mode of the dialog
     * @type {property}
     * Possible values:
     * "open" to load a file
     * "save" to save a file
     * "folder" to select a folder/directory
     * "multiple" to load multiple files
     */
    switch (mode) {
        case "save":
            this.mode = Ci.nsIFilePicker.modeSave;
            break;
        case "folder":
            this.mode = Ci.nsIFilePicker.modeGetFolder;
            break;
        case "multiple":
            this.mode = Ci.nsIFilePicker.modeOpenMultiple;
            break;
        case "open":
        default:
            this.mode = Ci.nsIFilePicker.modeOpen;
    }

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
