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
 * The Initial Developer of the Original Code is
 * Mike de Boer, Ajax.org.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
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
 * The fs module provides means to interact with the file system for manipulating
 * and querying files and directories.
 */

const {Cc, Ci, Cr} = require("chrome");
const xpcom = require("xpcom");
const file = require('file');

function MozFile(path) {
    var file = Cc['@mozilla.org/file/local;1']
               .createInstance(Ci.nsILocalFile);
    file.initWithPath(path);
    return file;
}

function ensureReadable(file) {
    if (!file.isReadable())
        throw new Error("path is not readable: " + file.path);
}

function ensureDir(file) {
    ensureExists(file);
    if (!file.isDirectory())
        throw new Error("path is not a directory: " + file.path);
}

function ensureFile(file) {
    ensureExists(file);
    if (!file.isFile())
        throw new Error("path is not a file: " + file.path);
}

function ensureExists(file) {
    if (!file.exists()) {
        throw xpcom.friendlyError(Cr.NS_ERROR_FILE_NOT_FOUND, {
            filename: file.path
        });
    }
}

/**
 * Returns an array of file names in the given directory.
 *
 * @param path {string}
 * The path of the directory.
 * @returns {array}
 * An array of file names.  Each is a basename, not a full path.
 * @throws if the path points to something other than a readable directory.
 */
exports.list = function list(path) {
  var file = MozFile(path);
  ensureDir(file);
  ensureReadable(file);

  var entries = file.directoryEntries;
  var entryNames = [];
  while(entries.hasMoreElements()) {
    var entry = entries.getNext();
    entry.QueryInterface(Ci.nsIFile);
    entryNames.push(entry.leafName);
  }
  return entryNames;
};

/**
 * Returns an array of [file object](file.File) in the given directory.
 *
 * @param path {string}
 * The path of the directory.
 * @returns {array}
 * An array of file objects.
 * @throws if the path points to something other than a readable directory.
 */
exports.listObjects = function(path) {
    var file = MozFile(path);
    ensureDir(file);
    ensureReadable(file);

    var entries = file.directoryEntries;
    var entryObjects = [];
    while(entries.hasMoreElements()) {
        var entry = entries.getNext();
        entry.QueryInterface(Ci.nsIFile);
        entryObjects.push( file.File(entry) );
    }
    return entryObjects;
};

/**
 * Copy a file.
 * @param {string} from The Path to the source file
 * @param {string} to The path to the destination file
 * @throws if the operation cannot be completed.
 */
exports.copy = function(from, to) {
    from = MozFile(from);
    ensureExists(file);
    to = MozFile(to);
    if (to.isFile())
        to = to.parent;
    ensureDir(to);
    from.copyTo(to);
};

/**
 * Move a file to a new location.
 * @param {string} from The Path to the source file
 * @param {string} to The path to the destination file
 * @throws if the operation cannot be completed.
 */
exports.move = function(from, to) {
    from = MozFile(from);
    ensureExists(from);
    to = MozFile(to);
    if (!to.exists || from.leafName === to.leafName)
        to = to.parent;
    from.moveTo(to, to.leafName);
};

/**
 * Returns true if a file exists at the given path and false otherwise.
 *
 * @param path {string} The path to a file.
 * @returns {boolean} True if the file exists and false otherwise.
 */
exports.exists = function exists(filename) {
  return MozFile(filename).exists();
};

/**
 * Given a path returns metadata about the file or directory.  If the path is a symlink it
 * will be dereferenced and information about the underlying file will be returned
 *
 * @param path {string} The path to a file.
 * @returns {object}
 * Returns an object with information about the file, including:
 *
 *  + `type` - either 'file' or 'directory'
 *  + `numEntries` - (for directories), the number of files in the directory.
 *  + `size` - (for files), the size of the file in bytes.
 *  + `lastModified` - (for files), the time (in seconds since epoch) of the last file modification.
 *
 * @throws if file doesn't exist
 */
exports.stat = function stat(filename) {
    var stats = { };
    var file = MozFile(filename);
    ensureExists(file);
    if (file.isDirectory()) {
        stats.type = 'directory';
        var dirEnum = file.directoryEntries;
        stats.numEntries = 0;
        while (dirEnum.hasMoreElements()) {
            stats.numEntries++;
            dirEnum.getNext();
        }
    } else {
        // For now we don't differentiate between symlinks and files
        stats.type = 'file';
        stats.size = file.fileSize;
        stats.lastModified = file.lastModifiedTime;
    }
    file = null;
    return stats;
};


/**
 * Removes a file from the file system.  To remove directories, use `rmdir`.
 *
 * @param path {string} The path of the file to remove.
 */
exports.remove = function remove(path) {
  var file = MozFile(path);
  ensureFile(file);
  file.remove(false);
};

/**
 * Makes a new directory named by the given path.  Any subdirectories that do not
 * exist are also created.  `mkpath` can be called multiple times on the same
 * path.
 *
 * @param path {string} The path to create.
 */
exports.mkpath = function mkpath(path) {
  var file = MozFile(path);
  if (!file.exists())
    file.create(Ci.nsIFile.DIRECTORY_TYPE, 0755); // u+rwx go+rx
  else if (!file.isDirectory())
    throw new Error("The path already exists and is not a directory: " + path);
};

/**
 * Removes a directory from the file system.  If the directory is not empty, an
 * exception is thrown.
 *
 * @param path {string} The path of the directory to remove.
 */
exports.rmdir = function rmdir(path) {
  var file = MozFile(path);
  ensureDir(file);
  try {
    file.remove(false);
  }
  catch (err) {
    // Bug 566950 explains why we're not catching a specific exception here.
    throw new Error("The directory is not empty: " + path);
  }
};
