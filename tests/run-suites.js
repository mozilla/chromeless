var unitTest = require("unit-test");
var file = require("file");
var url = require("url");

var run = exports.run = function run(options) {
  var myDir = file.dirname(url.toFilename(__url__));

  unitTest.findAndRunTests({dirs: [myDir],
                            onDone: options.onDone});
};
