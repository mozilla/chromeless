var traceback = require("traceback");
var {Cc,Ci,Cr,Cu} = require("chrome");

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

exports.testFromExceptionWithString = function(test) {
  try {
    throw "foob";
    test.fail("an exception should've been thrown");
  } catch (e if e == "foob") {
    var tb = traceback.fromException(e);
    test.assertEqual(tb.length, 0);
  }
};

exports.testFormatWithString = function(test) {
  // This can happen if e.g. a thrown exception was
  // a string instead of an Error instance.
  test.assertEqual(traceback.format("blah"),
		   "Traceback (most recent call last):");
};

exports.testFromExceptionWithError = function(test) {
  try {
    throwError();
    test.fail("an exception should've been thrown");
  } catch (e if e instanceof Error) {
    var tb = traceback.fromException(e);
    var xulApp = require("xul-app");
    test.assertEqual(tb.slice(-1)[0].funcName, "throwError");
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

exports.testExceptionsWithEmptyStacksAreLogged = function(test) {
  // Ensures that our fix to bug 550368 works.
  var sandbox = Cu.Sandbox("http://www.foo.com");
  var excRaised = false;
  try {
    Cu.evalInSandbox("returns 1 + 2;", sandbox, "1.8",
                     "blah.js", 25);
  } catch (e) {
    excRaised = true;
    var stack = traceback.fromException(e);
    test.assertEqual(stack.length, 1, "stack should have one frame");
    test.assert(stack[0].filename, "blah.js", "frame should have filename");
    test.assert(stack[0].lineNo, 25, "frame should have line no");
    test.assertEqual(stack[0].funcName, null, "frame should have null function name");
  }
  if (!excRaised)
    test.fail("Exception should have been raised.");
};
