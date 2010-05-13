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

exports.testMkpathRmdir = function (test) {
  var basePath = file.dirname(url.toFilename(__url__));
  var dirs = [];
  for (var i = 0; i < 3; i++)
    dirs.push("test-file-dir");
  var paths = [];
  for (var i = 0; i < dirs.length; i++) {
    var args = [basePath].concat(dirs.slice(0, i + 1));
    paths.unshift(file.join.apply(null, args));
  }
  for (i = 0; i < paths.length; i++) {
    test.assert(!file.exists(paths[i]),
                "Sanity check: path should not exist: " + paths[i]);
  }
  file.mkpath(paths[0]);
  test.assert(file.exists(paths[0]), "mkpath should create path: " + paths[0]);
  for (i = 0; i < paths.length; i++) {
    file.rmdir(paths[i]);
    test.assert(!file.exists(paths[i]),
                "rmdir should remove path: " + paths[i]);
  }
};

exports.testMkpathTwice = function (test) {
  var dir = file.dirname(url.toFilename(__url__));
  var path = file.join(dir, "test-file-dir");
  test.assert(!file.exists(path),
              "Sanity check: path should not exist: " + path);
  file.mkpath(path);
  test.assert(file.exists(path), "mkpath should create path: " + path);
  file.mkpath(path);
  test.assert(file.exists(path),
              "After second mkpath, path should still exist: " + path);
  file.rmdir(path);
  test.assert(!file.exists(path), "rmdir should remove path: " + path);
};

exports.testMkpathExistingNondirectory = function (test) {
  var fname = dataFileFilename(test);
  file.open(fname, "w").close();
  test.assert(file.exists(fname), "File should exist");
  test.assertRaises(function () file.mkpath(fname),
                    /^The path already exists and is not a directory: .+$/,
                    "mkpath on file should raise error");
  file.remove(fname);
};

exports.testRmdirNondirectory = function (test) {
  var fname = dataFileFilename(test);
  file.open(fname, "w").close();
  test.assert(file.exists(fname), "File should exist");
  test.assertRaises(function () file.rmdir(fname),
                    ERRORS.NOT_A_DIRECTORY,
                    "rmdir on file should raise error");
  file.remove(fname);
  test.assert(!file.exists(fname), "File should not exist");
  test.assertRaises(function () file.rmdir(fname),
                    ERRORS.FILE_NOT_FOUND,
                    "rmdir on non-existing file should raise error");
};

exports.testRmdirNonempty = function (test) {
  var dir = file.dirname(url.toFilename(__url__));
  var path = file.join(dir, "test-file-dir");
  test.assert(!file.exists(path),
              "Sanity check: path should not exist: " + path);
  file.mkpath(path);
  var filePath = file.join(path, "file");
  file.open(filePath, "w").close();
  test.assert(file.exists(filePath),
              "Sanity check: path should exist: " + filePath);
  test.assertRaises(function () file.rmdir(path),
                    /^The directory is not empty: .+$/,
                    "rmdir on non-empty directory should raise error");
  file.remove(filePath);
  file.rmdir(path);
  test.assert(!file.exists(path), "Path should not exist");
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
