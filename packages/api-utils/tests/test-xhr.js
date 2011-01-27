var xhr = require("xhr");
var timer = require("timer");

exports.testAbortedXhr = function(test) {
  var req = new xhr.XMLHttpRequest();
  test.assertEqual(xhr.getRequestCount(), 1);
  req.abort();
  test.assertEqual(xhr.getRequestCount(), 0);
};

exports.testLocalXhr = function(test) {
  var req = new xhr.XMLHttpRequest();
  req.overrideMimeType("text/plain");
  req.open("GET", __url__);
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 0) {
      test.assertMatches(req.responseText,
                         /onreadystatechange/,
                         "XMLHttpRequest should get local files");
      timer.setTimeout(
        function() { test.assertEqual(xhr.getRequestCount(), 0);
                     test.done(); },
        0
      );
    }
  };
  req.send(null);
  test.assertEqual(xhr.getRequestCount(), 1);
  test.waitUntilDone(4000);
};

exports.testUnload = function(test) {
  var loader = test.makeSandboxedLoader();
  var sbxhr = loader.require("xhr");
  var req = new sbxhr.XMLHttpRequest();
  req.overrideMimeType("text/plain");
  req.open("GET", __url__);
  req.send(null);
  test.assertEqual(sbxhr.getRequestCount(), 1);
  loader.unload();
  test.assertEqual(sbxhr.getRequestCount(), 0);
};

exports.testDelegatedReturns = function(test) {
  var req = new xhr.XMLHttpRequest();
  req.overrideMimeType("text/plain");
  req.open("GET", __url__);
  req.onreadystatechange = function() {
    if (req.readyState == 4 && req.status == 0) {
      // This response isn't going to have any headers, so the return value
      // should be null. Previously it wasn't returning anything, and thus was
      // undefined.
      
      // Depending on whether Bug 608939 has been applied
      // to the platform, getAllResponseHeaders() may return
      // null or the empty string; accept either.
      var headers = req.getAllResponseHeaders();
      test.assert(headers === null || headers === "",
                  "XHR's delegated methods should return");
      test.done();
    }
  };
  req.send(null);
  test.assertEqual(xhr.getRequestCount(), 1);
  test.waitUntilDone(4000);
}

