var file = require("file");
var url = require("url");
var streams = require("byte-streams");

const ERRORS = {
  FILE_NOT_FOUND: /^path does not exist: .*$/,
  NOT_A_DIRECTORY: /^path is not a directory: .*$/,
  IS_A_DIRECTORY: /^The stream was opened on a directory/,
  STREAM_CLOSED: /^The stream is closed/
};

exports.testDirName = function(test) {
  var aDir = url.toFilename("resource://gre/modules/");
  test.assertEqual(file.dirname(aDir),
                   aDir.slice(0, aDir.lastIndexOf("modules")-1),
                   "file.dirname() of dir should return parent dir");

  aDir = url.toFilename("resource://gre/modules/XPCOMUtils.jsm");
  test.assertEqual(file.dirname(aDir),
                   aDir.slice(0, aDir.lastIndexOf("XPCOM")-1),
                   "file.dirname() of file should return its dir");
};

exports.testList = function(test) {
  var list = file.list(url.toFilename("resource://gre/modules/"));
  var found = [true for each (name in list)
                    if (name == "XPCOMUtils.jsm")];
  if (found.length > 1)
    test.fail("a dir can't contain two files of the same name!");
  test.assertEqual(found[0], true, "file.list() should work");

  test.assertRaises(
    function() { file.list(url.toFilename(__url__)); },
    ERRORS.NOT_A_DIRECTORY,
    "file.list() on non-dir should raise error"
  );

  test.assertRaises(
    function() { file.list(url.toFilename("resource://gre/foo/")); },
    ERRORS.FILE_NOT_FOUND,
    "file.list() on nonexistent dir should raise error"
  );
};

exports.testRead = function(test) {
  var filename = url.toFilename(__url__);
  var contents = file.read(filename);
  test.assertMatches(contents, /file\.read\(\) should work/,
                     "file.read() should work");

  test.assertRaises(
    function() { file.read(filename + "blah"); },
    ERRORS.FILE_NOT_FOUND,
    "file.read() on nonexistent file should raise error"
  );

  test.assertRaises(
    function() { file.read(url.toFilename("resource://gre/modules/")); },
    ERRORS.IS_A_DIRECTORY,
    "file.read() on dir should raise error"
  );
};

exports.testJoin = function(test) {
  var filename = url.toFilename("resource://gre/modules/XPCOMUtils.jsm");
  var baseDir = file.dirname(filename);

  test.assertEqual(file.join(baseDir, "XPCOMUtils.jsm"),
                   filename,
                   "file.join() should work");
};

exports.testOpenRemove = function (test) {
  var existFname = url.toFilename(__url__);
  var dir = file.dirname(url.toFilename(__url__));
  var nonexistFname = file.join(dir, "test-file-data");
  test.assert(!file.exists(nonexistFname),
              "Sanity check: the file that this test assumes does not exist " +
              "should really not exist!");

  // Open a nonexistent file in read-only mode.
  test.assertRaises(function () file.open(nonexistFname),
                    ERRORS.FILE_NOT_FOUND,
                    "file.open() on nonexistent file should raise error");

  test.assertRaises(function () file.open(nonexistFname, "r"),
                    ERRORS.FILE_NOT_FOUND,
                    "file.open('r') on nonexistent file should raise error");

  test.assertRaises(function () file.open(nonexistFname, "zzz"),
                    ERRORS.FILE_NOT_FOUND,
                    "file.open('zzz') on nonexistent file should raise error");

  // Open an existent file in read-only mode.
  var stream = file.open(existFname);
  test.assert(stream instanceof streams.ByteReader && !("write" in stream),
              "Stream returned from file.open() should be read-only");
  stream.close();

  stream = file.open(existFname, "r");
  test.assert(stream instanceof streams.ByteReader && !("write" in stream),
              "Stream returned from file.open('r') should be read-only");
  stream.close();

  stream = file.open(existFname, "zzz");
  test.assert(stream instanceof streams.ByteReader && !("write" in stream),
              "Stream returned from file.open('zzz') should be read-only");
  stream.close();

  // Open a nonexistent file in write-only mode.
  stream = file.open(nonexistFname, "w");
  test.assert(stream instanceof streams.ByteWriter && !("read" in stream),
              "Stream returned from file.open('w') should be write-only");
  stream.close();
  test.assert(file.exists(nonexistFname),
              "file.exists() should return true after file.open('w')");
  file.remove(nonexistFname);
  test.assert(!file.exists(nonexistFname),
              "file.exists() should return false after file.remove()");

  stream = file.open(nonexistFname, "rw");
  test.assert(stream instanceof streams.ByteWriter && !("read" in stream),
              "Stream returned from file.open('rw') should be write-only");
  stream.close();
  test.assert(file.exists(nonexistFname),
              "file.exists() should return true after file.open('rw')");
  file.remove(nonexistFname);
  test.assert(!file.exists(nonexistFname),
              "file.exists() should return false after file.remove()");
};

exports.testWriteRead = function (test) {
  var dir = file.dirname(url.toFilename(__url__));
  var fname = file.join(dir, "test-file-data");

  // Write a small string less than the stream's buffer size and read it.
  var str = "All mimsy were the borogoves, And the mome raths outgrabe.";
  var stream = file.open(fname, "w");
  stream.write(str);
  stream.close();
  test.assertRaises(function () stream.write("This shouldn't work!"),
                    ERRORS.STREAM_CLOSED,
                    "Writing to stream after closing it should raise error");
  stream = file.open(fname);
  test.assertEqual(stream.read(), str,
                   "String read should be equal to string written");
  test.assertEqual(stream.read(), "",
                   "Reading from stream at EOF should return empty string");
  stream.close();
  test.assertRaises(function () stream.read(),
                    ERRORS.STREAM_CLOSED,
                    "Reading from stream after closing it should raise error");

  // Write a big string many times the size of the stream's buffer and read it.
  // Since it comes after the previous test, this also ensures that the file is
  // truncated when it's opened for writing.
  str = "";
  var bufLen = 1024;
  var fileSize = bufLen * 10;
  for (var i = 0; i < fileSize; i++) {
    str += i % 10;
  }
  stream = file.open(fname, "w");
  stream.write(str);
  stream.close();
  stream = file.open(fname);
  test.assertEqual(stream.read(), str,
                   "String read should be equal to string written");
  stream.close();

  // The same, but pass in only a |begin| arg when writing.  Write half of the
  // string, starting in the middle.
  stream = file.open(fname, "w");
  stream.write(str, str.length / 2);
  stream.close();
  stream = file.open(fname);
  test.assertEqual(stream.read(), str.substr(str.length / 2),
                   "String read should be equal to string written");
  stream.close();

  // The same, but write and read in chunks (and write the entire string).
  stream = file.open(fname, "w");
  i = 0;
  while (i < str.length) {
    stream.write(str, i, i + bufLen + 1);
    i += bufLen + 1;
  }
  stream.close();
  stream = file.open(fname);
  var readStr = "";
  var readLen = bufLen + 1;
  do {
    var frag = stream.read(readLen);
    readStr += frag;
  }
  while (frag);
  stream.close();
  test.assertEqual(readStr, str,
                   "Stream read in chunks should work as expected");

  // Read the same file, passing in strange numbers of bytes to read.
  stream = file.open(fname);
  test.assertEqual(stream.read(fileSize * 100), str,
                   "String read should be equal to string written");
  stream.close();

  stream = file.open(fname);
  test.assertEqual(stream.read(0), "",
                   "String read with zero length should be empty");
  stream.close();

  stream = file.open(fname);
  test.assertEqual(stream.read(-1), "",
                   "String read with negative length should be empty");
  stream.close();

  file.remove(fname);
};
