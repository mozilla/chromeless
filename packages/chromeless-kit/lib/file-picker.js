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
 */
function FilePicker(title) {
    var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);

    /**
     * The title of the dialog
     * @type {property}
     */
    this.title = title ? title : "Select a file";

    /**
     * Show the file picker dialog.
     * @param {function} callback
     * A callback that will be invoked once the user makes a selection.  Will
     * be passed `undefined` if nothing is selected
     */
    this.show = function(cb) {
        fp.init(mainWin.activeWindow, this.title, Ci.nsIFilePicker.modeOpen);
        fp.appendFilters(Ci.nsIFilePicker.filterAll | Ci.nsIFilePicker.filterText);
        var rv = fp.show();
        if (rv == Ci.nsIFilePicker.returnOK || rv == Ci.nsIFilePicker.returnReplace) {
            cb(fp.file.path);
        } else {
            cb(undefined);
        }
    };
}
/** @endclass */

exports.FilePicker = require("api-utils").publicConstructor(FilePicker);
