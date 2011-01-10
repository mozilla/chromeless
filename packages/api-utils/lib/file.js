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

var dirsvc = Cc["@mozilla.org/file/directory_service;1"]
             .getService(Ci.nsIProperties);

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

exports.exists = function exists(filename) {
  return MozFile(filename).exists();
};

exports.read = function read(filename) {
  var stream = exports.open(filename);
  try {
    var str = stream.read();
  }
  finally {
    stream.close();
  }

  return str;
};

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

exports.remove = function remove(path) {
  var file = MozFile(path);
  ensureFile(file);
  file.remove(false);
};

exports.mkpath = function mkpath(path) {
  var file = MozFile(path);
  if (!file.exists())
    file.create(Ci.nsIFile.DIRECTORY_TYPE, 0755); // u+rwx go+rx
  else if (!file.isDirectory())
    throw new Error("The path already exists and is not a directory: " + path);
};

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
