var traceback = require("traceback");

function throwNsIException() {
  var ios = Cc['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
  ios.newURI("i'm a malformed URI", null, null);
}

exports.testFromExceptionWithNsIException = function(test) {
  try {
    throwNsIException();
    test.fail("an exception should've been thrown");
  } catch (e if e.result == Cr.NS_ERROR_MALFORMED_URI) {
    var tb = traceback.fromException(e);
    test.assertEqual(tb.slice(-1)[0].funcName,
                     "throwNsIException");
  }
};

exports.testFormat = function(test) {
  function getTraceback() {
    return traceback.format();
  }

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
