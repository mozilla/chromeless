exports.testFormat = function(test) {
  function getTraceback() {
    return traceback.format();
  }

  var traceback = require("traceback");
  var formatted = getTraceback();
  test.assertEqual(typeof(formatted), "string");
  var lines = formatted.split("\n");
  test.assertEqual(lines.slice(-2)[0].indexOf("getTraceback") > 0,
                   true,
                   "formatted traceback should include function name");
  test.assertEqual(lines.slice(-1)[0].trim(),
                   "return traceback.format();",
                   "formatted traceback should include source code");
};
