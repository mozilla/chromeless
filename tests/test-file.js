var file = require("file");
var url = require("url");

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
    /^path is not a directory: .*$/,
    "file.list() on non-dir should raise error"
  );

  test.assertRaises(
    function() { file.list(url.toFilename("resource://gre/foo/")); },
    /^path does not exist: .*$/,
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
    /^path does not exist: .*$/,
    "file.read() on nonexistent file should raise error"
  );

  test.assertRaises(
    function() { file.read(url.toFilename("resource://gre/modules/")); },
    /^path is not a file: .*$/,
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
