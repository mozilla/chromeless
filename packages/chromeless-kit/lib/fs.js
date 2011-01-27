/* -*- Mode: Java; tab-width: 4; indent-tabs-mode: nil; c-basic-offset: 4 -*- */
/* vim:set ts=4 sw=4 sts=4 et: */
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

const {Cc, Ci, Cr} = require("chrome");
const xpcom = require("xpcom");

var File = require("file");
for (let i in File)
    exports[i] = File[i];

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

function FileWrapper(obj) {
    if (typeof obj == "string") {
        obj = MozFile(obj);
        obj.QueryInterface(Ci.nsIFile);
    }
    
    this.__defineGetter__("wrappedJSObject", function() obj);
    
    this.__defineGetter__("leafName", function() obj.leafName);
    this.__defineGetter__("permissions", function() obj.permissions);
    this.__defineGetter__("permissionsOfLink", function() obj.permissionsOfLink);
    this.__defineGetter__("lastModifiedTime", function() obj.lastModifiedTime);
    this.__defineGetter__("lastModifiedTimeOfLink", function() obj.lastModifiedTimeOfLink);
    this.__defineGetter__("fileSize", function() obj.fileSize);
    this.__defineGetter__("fileSizeOfLink", function() obj.fileSizeOfLink);
    //this.__defineGetter__("target", function() obj.target);
    this.__defineGetter__("path", function() obj.path);
    this.__defineGetter__("parent", function() obj.parent);
    this.__defineGetter__("directoryEntries", function() obj.directoryEntries);
    this.__defineGetter__("followLinks", function() obj.followLinks);
    this.__defineGetter__("diskSpaceAvailable", function() obj.diskSpaceAvailable);
    this.__defineGetter__("persistentDescriptor", function() obj.persistentDescriptor);
    
    // mapping of boolean returning functions:
    this.exists = function() obj.exists();
    this.isWritable = function() obj.isWritable();
    this.isReadable = function() obj.isReadable();
    this.isExecutable = function() obj.isExecutable();
    this.isHidden = function() obj.isHidden();
    this.isDirectory = function() obj.isDirectory();
    this.isFile = function() obj.isFile();
    this.isSymlink = function() obj.isSymlink();
    this.isSpecial = function() obj.isSpecial();
    
    this.toString = function FileWrapper_toString() obj.path;
};
exports.file = require("api-utils").publicConstructor(FileWrapper);

exports.get = function(path) {
    return new FileWrapper(path);
};

exports.listObjects = function(path, callback) {
    var file = MozFile(path);
    ensureDir(file);
    ensureReadable(file);
    
    var entries = file.directoryEntries;
    var entryNames = [];
    while(entries.hasMoreElements()) {
        var entry = entries.getNext();
        entry.QueryInterface(Ci.nsIFile);
        entryNames.push(new FileWrapper(entry));
    }
    return callback ? callback(entryNames) : entryNames;
};

exports.write = function(path, content) {
    var stream = exports.open(path, "w");
    try {
        stream.write(content);
    }
    finally {
        stream.close();
    }
};

exports.remove = function remove(path) {
    var file = MozFile(path);
    ensureExists(file);
    file.remove(true);
};

exports.copy = function(from, to) {
    from = MozFile(from);
    ensureExists(file);
    to = MozFile(to);
    if (to.isFile())
        to = to.parent;
    ensureDir(to);
    from.copyTo(to);
};

exports.move = function(from, to) {
    from = MozFile(from);
    ensureExists(from);
    to = MozFile(to);
    if (!to.exists || from.leafName === to.leafName)
        to = to.parent;
    from.moveTo(to, to.leafName);
};
