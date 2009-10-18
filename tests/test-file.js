var file = require("file");

exports.testList = function(test) {
  var url = require("url");
  var list = file.list(url.toFilename("resource://gre/modules/"));
  var found = [true for each (name in list)
                    if (name == "XPCOMUtils.jsm")];
  if (found.length > 1)
    test.fail("a dir can't contain two files of the same name!");
  test.assertEqual(found[0], true, "file.list() should work");
};
