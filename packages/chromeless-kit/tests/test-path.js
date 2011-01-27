const path = require("path");
const self = require("self");

function getDataFilePath(file) {
  return require("url").toFilename(self.data.url(file));
}

exports.testPathJoin = function (test) {
  let dir = getDataFilePath("test-fs");
  test.assert(path.existsSync(dir));
  let file = path.join(dir,"path.tst");
  
  test.assertEqual(path.dirname(file),dir);
  test.assertEqual(path.basename(file),"path.tst");
  test.assertEqual(path.extname(file),".tst");
  
  test.assert(path.existsSync(file));
  test.assert(!path.existsSync(path.join(dir,"path-not-exists")));
  test.waitUntilDone();
  path.exists(file,function (result) {
    test.assert(result,"path.exists on valid files");
    path.exists(path.join(dir,"path-not-exists"),function (result) {
      test.assert(!result,"path.exists on non-valid files");
      test.done();
    });
  });
}
