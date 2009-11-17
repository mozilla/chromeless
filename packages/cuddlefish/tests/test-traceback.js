var traceback = require("traceback");

function throwNsIException() {
  var ios = Cc['@mozilla.org/network/io-service;1']
            .getService(Ci.nsIIOService);
  ios.newURI("i'm a malformed URI", null, null);
}

function throwError() {
  throw new Error("foob");
}

exports.testFormatDoesNotFetchRemoteFiles = function(test) {
  var observers = require("observer-service");
  ["http", "https"].forEach(
    function(scheme) {
      var httpRequests = 0;
      function onHttp() {
        httpRequests++;
      }

      observers.add("http-on-modify-request", onHttp);

      try {
        var tb = [{filename: scheme + "://www.mozilla.org/",
                   lineNo: 1,
                   funcName: "blah"}];
        traceback.format(tb);
      } catch (e) {
        test.exception(e);
      }

      observers.remove("http-on-modify-request", onHttp);

      test.assertEqual(httpRequests, 0,
                       "traceback.format() does not make " +
                       scheme + " request");
    });
};

exports.testFromExceptionWithError = function(test) {
  try {
    throwError();
    test.fail("an exception should've been thrown");
  } catch (e if e instanceof Error) {
    var tb = traceback.fromException(e);
    test.assertEqual(tb.slice(-1)[0].funcName,
                     "Error");
    test.assertEqual(tb.slice(-2)[0].funcName,
                     "throwError");
  }
};

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
