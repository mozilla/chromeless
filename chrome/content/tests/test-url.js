var url = require("url");

exports.testResolve = function(test) {
  test.assertEqual(url.resolve("http://www.foo.com/", "bar"),
                   "http://www.foo.com/bar");

  test.assertEqual(url.resolve("http://www.foo.com", "bar"),
                   "http://www.foo.com/bar");

  test.assertEqual(url.resolve("http://foo.com/", "http://bar.com/"),
                   "http://bar.com/",
                   "relative should override base");

  test.assertRaises(function() { url.resolve("blah"); },
                    "malformed URI: blah",
                    "url.resolve() should throw malformed URI on base");

  test.assertRaises(function() { url.resolve("chrome://global"); },
                    "invalid URI: chrome://global",
                    "url.resolve() should throw invalid URI on base");

  test.assertEqual(url.resolve("http://www.foo.com", ""),
                   "http://www.foo.com/",
                   "url.resolve() should add slash to end of domain");
};

exports.testParse = function(test) {
  var info = url.parse("http://foo.com/bar");
  test.assertEqual(info.scheme, "http");
  test.assertEqual(info.host, "foo.com");
  test.assertEqual(info.port, null);
  test.assertEqual(info.userPass, "");
  test.assertEqual(info.path, "/bar");
};
