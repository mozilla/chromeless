/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim:set ts=2 sw=2 sts=2 et filetype=javascript
 * ***** BEGIN LICENSE BLOCK *****
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
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is
 * the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Drew Willcoxon <adw@mozilla.com> (Original Author)
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

exports.ByteReader = ByteReader;
exports.ByteWriter = ByteWriter;

const {Cc, Ci} = require("chrome");

// This just controls the maximum number of bytes we read in at one time.
const BUFFER_BYTE_LEN = 0x8000;

function ByteReader(inputStream) {
  const self = this;

  let stream = Cc["@mozilla.org/binaryinputstream;1"].
               createInstance(Ci.nsIBinaryInputStream);
  stream.setInputStream(inputStream);

  let manager = new StreamManager(this, stream);

  this.read = function ByteReader_read(numBytes) {
    manager.ensureOpened();
    if (typeof(numBytes) !== "number")
      numBytes = Infinity;

    let data = "";
    let read = 0;
    try {
      while (true) {
        let avail = stream.available();
        let toRead = Math.min(numBytes - read, avail, BUFFER_BYTE_LEN);
        if (toRead <= 0)
          break;
        data += stream.readBytes(toRead);
        read += toRead;
      }
    }
    catch (err) {
      throw new Error("Error reading from stream: " + err);
    }

    return data;
  };
}

function ByteWriter(outputStream) {
  const self = this;

  let stream = Cc["@mozilla.org/binaryoutputstream;1"].
               createInstance(Ci.nsIBinaryOutputStream);
  stream.setOutputStream(outputStream);

  let manager = new StreamManager(this, stream);

  this.write = function ByteWriter_write(str) {
    manager.ensureOpened();
    try {
      stream.writeBytes(str, str.length);
    }
    catch (err) {
      throw new Error("Error writing to stream: " + err);
    }
  };
}


// This manages the lifetime of stream, a ByteReader or ByteWriter.  It defines
// closed and close() on stream and registers an unload listener that closes
// rawStream if it's still opened.  It also provides ensureOpened(), which
// throws an exception if the stream is closed.
function StreamManager(stream, rawStream) {
  const self = this;
  this.rawStream = rawStream;
  this.opened = true;

  stream.__defineGetter__("closed", function stream_closed() {
    return !self.opened;
  });

  stream.close = function stream_close() {
    self.ensureOpened();
    self.unload();
  };

  require("unload").ensure(this);
}

StreamManager.prototype = {
  ensureOpened: function StreamManager_ensureOpened() {
    if (!this.opened)
      throw new Error("The stream is closed and cannot be used.");
  },
  unload: function StreamManager_unload() {
    this.rawStream.close();
    this.opened = false;
  }
};
