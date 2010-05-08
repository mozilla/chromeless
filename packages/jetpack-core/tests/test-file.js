var file = require("file");
var url = require("url");
var byteStreams = require("byte-streams");
var textStreams = require("text-streams");

const ERRORS = {
  FILE_NOT_FOUND: /^path does not exist: .+$/,
  NOT_A_DIRECTORY: /^path is not a directory: .+$/,
  NOT_A_FILE: /^path is not a file: .+$/,
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
   ERRORS.NOT_A_FILE,
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

exports.testOpenNonexistentForRead = function (test) {
  var filename = dataFileFilename(test);
  test.assertRaises(function () file.open(filename),
                    ERRORS.FILE_NOT_FOUND,
                    "file.open() on nonexistent file should raise error");
  test.assertRaises(function () file.open(filename, "r"),
                    ERRORS.FILE_NOT_FOUND,
                    "file.open('r') on nonexistent file should raise error");
  test.assertRaises(function () file.open(filename, "zzz"),
                    ERRORS.FILE_NOT_FOUND,
                    "file.open('zzz') on nonexistent file should raise error");
};

exports.testOpenNonexistentForWrite = function (test) {
  var filename = dataFileFilename(test);

  var stream = file.open(filename, "w");
  stream.close();

  test.assert(file.exists(filename),
              "file.exists() should return true after file.open('w')");
  file.remove(filename);
  test.assert(!file.exists(filename),
              "file.exists() should return false after file.remove()");

  stream = file.open(filename, "rw");
  stream.close();

  test.assert(file.exists(filename),
              "file.exists() should return true after file.open('rw')");
  file.remove(filename);
  test.assert(!file.exists(filename),
              "file.exists() should return false after file.remove()");
};

exports.testOpenDirectory = function (test) {
  var dir = file.dirname(url.toFilename(__url__));
  test.assertRaises(function () file.open(dir),
                    ERRORS.NOT_A_FILE,
                    "file.open() on directory should raise error");
  test.assertRaises(function () file.open(dir, "w"),
                    ERRORS.NOT_A_FILE,
                    "file.open('w') on directory should raise error");
};

exports.testOpenTypes = function (test) {
  var filename = dataFileFilename(test);

  // Do the opens first to create the data file.
  var stream = file.open(filename, "w");
  test.assert(stream instanceof textStreams.TextWriter,
              "open(w) should return a TextWriter");
  stream.close();

  stream = file.open(filename, "wb");
  test.assert(stream instanceof byteStreams.ByteWriter,
              "open(wb) should return a ByteWriter");
  stream.close();

  stream = file.open(filename);
  test.assert(stream instanceof textStreams.TextReader,
              "open() should return a TextReader");
  stream.close();

  stream = file.open(filename, "r");
  test.assert(stream instanceof textStreams.TextReader,
              "open(r) should return a TextReader");
  stream.close();

  stream = file.open(filename, "b");
  test.assert(stream instanceof byteStreams.ByteReader,
              "open(b) should return a ByteReader");
  stream.close();

  stream = file.open(filename, "rb");
  test.assert(stream instanceof byteStreams.ByteReader,
              "open(rb) should return a ByteReader");
  stream.close();

  file.remove(filename);
};

// Returns the name of a file that should be used to test writing and reading.
function dataFileFilename(test) {
  var dir = file.dirname(url.toFilename(__url__));
  var fname = file.join(dir, "test-file-data");
  test.assert(!file.exists(fname),
              "Sanity check: the file that this test assumes does not " +
              "exist should really not exist!");
  return fname;
}
