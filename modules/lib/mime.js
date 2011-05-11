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

/**
 * Tools for guessing mime types from file extensions/paths.
 */

const {Cc, Ci, Cr} = require("chrome");
const path = require('path');

const defaultMime = "application/octet-stream";

/**
 * @property defaultMime
 * The default mime type that will be used when we encounter an unknown extension
 * type.
 */
exports.__defineGetter__("defaultMime", function() { return defaultMime; });


// Mime type lookup table
const types = {
    "3gp"   : "video/3gpp",
    "a"     : "application/octet-stream",
    "aml"   : "application/aml",
    "asm"   : "text/x-asm",
    "atom"  : "application/atom+xml",
    "bz2"   : "application/x-bzip2",
    "cab"   : "application/vnd.ms-cab-compressed",
    "coffee": "text/x-script.coffeescript",
    "conf"  : "text/plain",
    "der"   : "application/x-x509-ca-cert",
    "dtd"   : "application/xml-dtd",
    "ear"   : "application/java-archive",
    "f"     : "text/x-fortran",
    "f77"   : "text/x-fortran",
    "f90"   : "text/x-fortran",
    "for"   : "text/x-fortran",
    "gem"   : "application/octet-stream",
    "gemspec" : "text/x-script.ruby",
    "ifb"   : "text/calendar",
    "json"  : "application/json",
    "log"   : "text/plain",
    "m4v"   : "video/mp4",
    "manifest": "text/cache-manifest",
    "mathml" : "application/mathml+xml",
    "mbox"  : "application/mbox",
    "mdoc"  : "text/troff",
    "mime"  : "message/rfc822",
    "mp4v"  : "video/mp4",
    "pem"   : "application/x-x509-ca-cert",
    "php"   : "application/x-httpd-php",
    "pkg"   : "application/octet-stream",
    "rake"  : "text/x-script.ruby",
    "rb"    : "text/x-script.ruby",
    "ru"    : "text/x-script.ruby",
    "s"     : "text/x-asm",
    "sgm"   : "text/sgml",
    "sgml"  : "text/sgml",
    "sig"   : "application/pgp-signature",
    "so"    : "application/octet-stream",
    "tbz"   : "application/x-bzip-compressed-tar",
    "tci"   : "application/x-topcloud",
    "ttf"   : "application/x-font-ttf",
    "war"   : "application/java-archive",
    "wsdl"  : "application/wsdl+xml",
    "xslt"  : "application/xslt+xml",
    "yaml"  : "text/yaml",
    "yml"   : "text/yaml"
};

/**
* Given a file path (or extension), look up an appropriate mime type.
*
* @param {string} path (`/foo/bar/baz.txt/) or just a file extension (`exe`)
* @return {string} appropriate mime type for input
*/
exports.guess = function(filePath) {
    // implementation tactic: this function uses a two level lookup.
    // First we'll use the mime service from the mozilla platform, and
    // then we'll augment that with a lookup table.
    //
    // This approach assumes that we should trust the mozilla codebase,
    // but allows us to add support for specific types without waiting
    // for them to land upstream (in moz proper)

    var ext = path.extname(filePath);
    // support the case where client passes in a bare extension: i.e. 'txt'
    if (ext.length === 0) ext = filePath;
    ext = ext.toLowerCase();
    // remove dot
    if (ext[0] == '.') ext = ext.substr(1);

    var mimeType = null;

    try {
        var mSvc = Cc["@mozilla.org/mime;1"]
                     .createInstance(Ci.nsIMIMEService);
        xulVal = mSvc.getTypeFromExtension(ext);
    } catch (e) { }

    if (mimeType === null) {
        if (ext in types) {
            mimeType = types[ext];
        } else {
            mimeType = defaultMime;
        }
    }

    return mimeType;
};
