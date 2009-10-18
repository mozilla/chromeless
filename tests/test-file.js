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
};
