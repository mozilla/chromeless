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
 *   Drew Willcoxon <adw@mozilla.com>
 *   Mike De Boer <deboer.md@gmail.com>
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
 * Provides access to the local filesystem.
 */

const {Cc,Ci,Cr} = require("chrome");
const byteStreams = require("byte-streams");
const textStreams = require("text-streams");
const xpcom = require("xpcom");

// Flags passed when opening a file.  See nsprpub/pr/include/prio.h.
const OPEN_FLAGS = {
  RDONLY: 0x01,
  WRONLY: 0x02,
  CREATE_FILE: 0x08,
  APPEND: 0x10,
  TRUNCATE: 0x20,
  EXCL: 0x80
};

function MozFile(path) {
  var file = Cc['@mozilla.org/file/local;1']
             .createInstance(Ci.nsILocalFile);
  file.initWithPath(path);
  return file;
}

function ensureExists(file) {
  if (!file.exists()) {
    throw xpcom.friendlyError(Cr.NS_ERROR_FILE_NOT_FOUND, {
      filename: file.path
    });
  }
}

function ensureFile(file) {
  ensureExists(file);
  if (!file.isFile())
    throw new Error("path is not a file: " + file.path);
}

/**
 * Opens a file in text mode and returns a string containing its entire contents.
 *
 * @param path {string}
 * The path of the file to read.
 * @returns {string}
 * A string containing the file's entire contents.
 */
exports.read = function read(path) {
  var stream = exports.open(path);
  try {
    var str = stream.read();
  }
  finally {
    stream.close();
  }

  return str;
};


/**
 * Creates a text file and writes the entir contents of a string to
 * it.
 * @param path The path at which the file should be created
 * @param content The content to write.
 * @throws if file exists, or cannot be created.
 */
exports.write = function(path, content) {
    if (MozFile(path).exists()) throw new Error("path exists: " + path);

    var stream = exports.open(path, "w");
    try {
        stream.write(content);
    }
    finally {
        stream.close();
    }
};

/**
 * Returns a stream providing access to the contents of a file.
 *
 * @param path {string}
 * The path of the file to open.
 *
 * @param [mode] {string}
 * An optional string, each character of which describes a characteristic of the
 * returned stream.  If the string contains `"r"`, the file is opened in
 * read-only mode.  `"w"` opens the file in write-only mode.  `"b"` opens the
 * file in binary mode.  If `"b"` is not present, the file is opened in text
 * mode, and its contents are assumed to be UTF-8.  If *`mode`* is not given,
 * `"r"` is assumed, and the file is opened in read-only text mode.
 *
 * @returns {stream}
 * A stream that can be used to access or modify the contents of the file.  See
 * [`text-streams`](#module/api-utils/text-streams) and
 * [`byte-streams`](#module/api-utils/byte-streams) for more information.
 * Opened files should always be closed after use by calling `close` on the
 * returned stream.
 */
exports.open = function open(filename, mode) {
  var file = MozFile(filename);
  if (typeof(mode) !== "string")
    mode = "";

  // File opened for write only.
  if (/w/.test(mode)) {
    if (file.exists())
      ensureFile(file);
    var stream = Cc['@mozilla.org/network/file-output-stream;1'].
                 createInstance(Ci.nsIFileOutputStream);
    var openFlags = OPEN_FLAGS.WRONLY |
                    OPEN_FLAGS.CREATE_FILE |
                    OPEN_FLAGS.TRUNCATE;
    var permFlags = 0644; // u+rw go+r
    try {
      stream.init(file, openFlags, permFlags, 0);
    }
    catch (err) {
      throw xpcom.friendlyError(err, { filename: filename });
    }
    return /b/.test(mode) ?
           new byteStreams.ByteWriter(stream) :
           new textStreams.TextWriter(stream);
  }

  // File opened for read only, the default.
  ensureFile(file);
  stream = Cc['@mozilla.org/network/file-input-stream;1'].
           createInstance(Ci.nsIFileInputStream);
  try {
    stream.init(file, OPEN_FLAGS.RDONLY, 0, 0);
  }
  catch (err) {
    throw xpcom.friendlyError(err, { filename: filename });
  }
  return /b/.test(mode) ?
         new byteStreams.ByteReader(stream) :
         new textStreams.TextReader(stream);
};

/**
 * @class File
 * A file abstraction that allows direct access to meta-data
 * about a file.
 */
function FileWrapper(obj) {
  if (typeof obj == "string") {
    obj = MozFile(obj);
    obj.QueryInterface(Ci.nsIFile);
  }

  //    this.__defineGetter__("wrappedJSObject", function() obj);

  this.__defineGetter__("leafName", function() obj.leafName);
  /** @property permissions The file's permissions (follows symlinks) */
  this.__defineGetter__("permissions", function() obj.permissions);
  /** @property permissionsOfLink The file's permissions (does not follow symlinks) */
  this.__defineGetter__("permissionsOfLink", function() obj.permissionsOfLink);
  /** @property lastModifiedTime The last time this file was modified (follows symlinks) */
  this.__defineGetter__("lastModifiedTime", function() obj.lastModifiedTime);
  /** @property lastModifiedTimeOfLink The last time this file was modified (does not follow symlinks) */
  this.__defineGetter__("lastModifiedTimeOfLink", function() obj.lastModifiedTimeOfLink);

  /** @property {integer} fileSize Size of file in bytes (follows symlinks) */
  this.__defineGetter__("fileSize", function() obj.fileSize);
  /** @property {integer} fileSize Size of file in bytes (does not follow symlinks) */
  this.__defineGetter__("fileSizeOfLink", function() obj.fileSizeOfLink);
  //this.__defineGetter__("target", function() obj.target);
  /** @property {string} path The absolute path to the file */
  this.__defineGetter__("path", function() obj.path);

  /** @property {string} path The absolute path to the parent of the file */
  this.__defineGetter__("parent", function() obj.parent);

/*
  this.__defineGetter__("directoryEntries", function() obj.directoryEntries);
  this.__defineGetter__("followLinks", function() obj.followLinks);
  this.__defineGetter__("diskSpaceAvailable", function() obj.diskSpaceAvailable);
  this.__defineGetter__("persistentDescriptor", function() obj.persistentDescriptor);
*/
  // mapping of boolean returning functions:
  /** @function exists
   *  Check file existence.
   *  @returns {boolean} true if the file exists.
   */
  this.exists = function() obj.exists();
  /** @function isWritable
   *  @returns {boolean} true if the file is writable. */
  this.isWritable = function() obj.isWritable();
  /** @function isReadble
   *  @returns {boolean} true if the file is readable. */
  this.isReadable = function() obj.isReadable();
  /** @function isExecutable
   *  @returns {boolean} true if the file is executable. */
  this.isExecutable = function() obj.isExecutable();
  /** @function isHidden
   *  @returns {boolean} true if the file is hidden. */
  this.isHidden = function() obj.isHidden();
  /** @function isDirectory
   *  @returns {boolean} true if the file is a directory. */
  this.isDirectory = function() obj.isDirectory();
  /** @function isDirectory
   *  @returns {boolean} true if the file is a regular file. */
  this.isFile = function() obj.isFile();
  /** @function isDirectory
   *  @returns {boolean} true if the file is a symlink. */
  this.isSymlink = function() obj.isSymlink();
  /** @function isSpecial
   *  @returns {boolean} true if the file is a special file (i.e. device) */
  this.isSpecial = function() obj.isSpecial();

  /** @function toString
   *  @returns {string} concoct a reasonable string representation of a file */
  this.toString = function FileWrapper_toString() obj.path;
};

/** @constructor
 *  @param {string} path The path from which to construct a File object.
 *  @returns {File} an object representation of a file
 */
exports.File = require("api-utils").publicConstructor(FileWrapper);

/** @endclass */