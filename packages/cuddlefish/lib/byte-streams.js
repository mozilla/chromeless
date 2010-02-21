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
 * The Original Code is Cuddlefish.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Foundation.
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

const xpcom = require("xpcom");

const BUFFER_BYTE_LEN = 1024;

/**
 * A binary input stream.  The stream is backed by a Mozilla platform stream
 * that provides the underlying data, such as an nsIFileInputStream.
 *
 * @param backingStream
 *        A Mozilla platform stream object.
 */
function ByteReader(backingStream) {
  const self = this;
  streamRegistry.register(this);
  let stream = Cc["@mozilla.org/binaryinputstream;1"].
                 createInstance(Ci.nsIBinaryInputStream);
  stream.setInputStream(backingStream);

  /**
   * Closes the stream.
   */
  this.close = function ByteReader_close() {
    stream.close();
    streamRegistry.unregister(self);
  };

  /**
   * Reads from the stream starting at its current position.  If the stream is
   * closed, an exception is thrown.
   *
   * @param  numBytes
   *         The number of bytes to read.  If not specified, the remainder of
   *         the entire stream is read.
   * @return A string containing the bytes read.  If the stream is at EOF,
   *         returns the empty string.
   */
  this.read = function ByteReader_read(numBytes) {
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
      xpcom.throwFriendlyError(err);
    }

    return data;
  };
}

/**
 * A binary output stream.  The stream is backed by a Mozilla platform stream
 * that actually writes out the data, such as an nsIFileOutputStream.
 *
 * @param backingStream
 *        A Mozilla platform stream object.
 */
function ByteWriter(backingStream) {
  const self = this;
  streamRegistry.register(this);
  let stream = Cc["@mozilla.org/binaryoutputstream;1"].
               createInstance(Ci.nsIBinaryOutputStream);
  stream.setOutputStream(backingStream);

  /**
   * Closes the stream.
   */
  this.close = function ByteWriter_close() {
    stream.close();
    streamRegistry.unregister(self);
  };

  /**
   * Writes to the stream.  If the stream is closed, an exception is thrown.
   * begin and end are optional and control the portion of str that is output.
   * If neither is specified, str is output in its entirety.  If only begin is
   * specified, the suffix begining at that index is output.  If both are
   * specified, the range [begin, end) is output.
   *
   * @param str
   *        The string to write.
   * @param begin
   *        An optional argument specifying the index of str at which to start
   *        output.
   * @param end
   *        An optional argument specifying the index of str at which to end
   *        output.  The byte at index end - 1 is the last byte output.
   */
  this.write = function ByteWriter_write(str, begin, end) {
    if (typeof(begin) === "number") {
      let args = [begin];
      if (typeof(end) === "number")
        args.push(end);
      str = str.substring.apply(str, args);
    }
    try {
      stream.writeBytes(str, str.length);
    }
    catch (err) {
      xpcom.throwFriendlyError(err);
    }
  };
}

// On unload, close all currently opened streams.
require("unload").when(function byteStreams_unload() {
  while (streamRegistry.streams.length > 0) {
    streamRegistry.streams[0].close();
  }
});

// This keeps track of all open streams, nothing more.  Streams register
// themselves when they're opened and unregister when they're closed.
let streamRegistry = {
  streams: [],

  register: function streamRegistry_register(stream) {
    this.streams.push(stream);
  },

  unregister: function streamRegistry_unregister(stream) {
    let idx = this.streams.indexOf(stream);
    if (idx < 0) {
      throw new Error("Internal error: tried to unregister an unregistered " +
                      "byte stream");
    }
    this.streams.splice(idx, 1);
  }
};
