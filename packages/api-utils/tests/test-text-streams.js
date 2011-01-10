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

const file = require("file");
const url = require("url");

const STREAM_CLOSED_ERROR = "The stream is closed and cannot be used.";

// This should match the constant of the same name in text-streams.js.
const BUFFER_BYTE_LEN = 0x8000;

exports.testWriteRead = function (test) {
  let fname = dataFileFilename();

  // Write a small string less than the stream's buffer size...
  let str = "exports.testWriteRead data!";
  let stream = file.open(fname, "w");
  test.assert(!stream.closed, "stream.closed after open should be false");
  stream.write(str);
  stream.close();
  test.assert(stream.closed, "stream.closed after close should be true");
  test.assertRaises(function () stream.close(),
                    STREAM_CLOSED_ERROR,
                    "stream.close after already closed should raise error");
  test.assertRaises(function () stream.write("This shouldn't be written!"),
                    STREAM_CLOSED_ERROR,
                    "stream.write after close should raise error");

  // ... and read it.
  stream = file.open(fname);
  test.assert(!stream.closed, "stream.closed after open should be false");
  test.assertEqual(stream.read(), str,
                   "stream.read should return string written");
  test.assertEqual(stream.read(), "",
                   "stream.read at EOS should return empty string");
  stream.close();
  test.assert(stream.closed, "stream.closed after close should be true");
  test.assertRaises(function () stream.close(),
                    STREAM_CLOSED_ERROR,
                    "stream.close after already closed should raise error");
  test.assertRaises(function () stream.read(),
                    STREAM_CLOSED_ERROR,
                    "stream.read after close should raise error");

  // Write a big string many times the size of the stream's buffer and read it.
  // Since it comes after the previous test, this also ensures that the file is
  // truncated when it's opened for writing.
  str = "";
  let bufLen = BUFFER_BYTE_LEN;
  let fileSize = bufLen * 10;
  for (let i = 0; i < fileSize; i++)
    str += i % 10;
  stream = file.open(fname, "w");
  stream.write(str);
  stream.close();
  stream = file.open(fname);
  test.assertEqual(stream.read(), str,
                   "stream.read should return string written");
  stream.close();

  // The same, but write and read in chunks.
  stream = file.open(fname, "w");
  let i = 0;
  while (i < str.length) {
    // Use a chunk length that spans buffers.
    let chunk = str.substr(i, bufLen + 1);
    stream.write(chunk);
    i += bufLen + 1;
  }
  stream.close();
  stream = file.open(fname);
  let readStr = "";
  bufLen = BUFFER_BYTE_LEN;
  let readLen = bufLen + 1;
  do {
    var frag = stream.read(readLen);
    readStr += frag;
  } while (frag);
  stream.close();
  test.assertEqual(readStr, str,
                   "stream.write and read in chunks should work as expected");

  // Read the same file, passing in strange numbers of bytes to read.
  stream = file.open(fname);
  test.assertEqual(stream.read(fileSize * 100), str,
                   "stream.read with big byte length should return string " +
                   "written");
  stream.close();

  stream = file.open(fname);
  test.assertEqual(stream.read(0), "",
                   "string.read with zero byte length should return empty " +
                   "string");
  stream.close();

  stream = file.open(fname);
  test.assertEqual(stream.read(-1), "",
                   "string.read with negative byte length should return " +
                   "empty string");
  stream.close();

  file.remove(fname);
};

exports.testWriteAsync = function (test) {
  test.waitUntilDone();

  let fname = dataFileFilename();
  let str = "exports.testWriteAsync data!";
  let stream = file.open(fname, "w");
  test.assert(!stream.closed, "stream.closed after open should be false");

  // Write.
  stream.writeAsync(str, function (err) {
    test.assertEqual(this, stream, "|this| should be the stream object");
    test.assertEqual(err, undefined,
                     "stream.writeAsync should not cause error");
    test.assert(stream.closed, "stream.closed after write should be true");
    test.assertRaises(function () stream.close(),
                      STREAM_CLOSED_ERROR,
                      "stream.close after already closed should raise error");
    test.assertRaises(function () stream.writeAsync("This shouldn't work!"),
                      STREAM_CLOSED_ERROR,
                      "stream.writeAsync after close should raise error");

    // Read.
    stream = file.open(fname, "r");
    test.assert(!stream.closed, "stream.closed after open should be false");
    let readStr = stream.read();
    test.assertEqual(readStr, str,
                     "string.read should yield string written");
    stream.close();
    file.remove(fname);
    test.done();
  });
};

exports.testUnload = function (test) {
  let loader = test.makeSandboxedLoader();
  let file = loader.require("file");

  let filename = url.toFilename(__url__);
  let stream = file.open(filename);

  loader.unload();
  test.assert(stream.closed, "stream should be closed after module unload");
};

// Returns the name of a file that should be used to test writing and reading.
function dataFileFilename() {
  let dir = file.dirname(url.toFilename(__url__));
  return file.join(dir, "test-text-streams-data");
}
