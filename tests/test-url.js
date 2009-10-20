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

  test.assertRaises(function() { url.resolve("chrome://foo/bar"); },
                    "invalid URI: chrome://foo/bar",
                    "url.resolve() should throw on bad chrome URI");

  test.assertEqual(url.resolve("http://www.foo.com", ""),
                   "http://www.foo.com/",
                   "url.resolve() should add slash to end of domain");
};

exports.testParseHttp = function(test) {
  var info = url.parse("http://foo.com/bar");
  test.assertEqual(info.scheme, "http");
  test.assertEqual(info.host, "foo.com");
  test.assertEqual(info.port, null);
  test.assertEqual(info.userPass, null);
  test.assertEqual(info.path, "/bar");
};

exports.testParseChrome = function(test) {
  var info = url.parse("chrome://global/content/blah");
  test.assertEqual(info.scheme, "chrome");
  test.assertEqual(info.host, "global");
  test.assertEqual(info.port, null);
  test.assertEqual(info.userPass, null);
  test.assertEqual(info.path, "/content/blah");
};

exports.testParseAbout = function(test) {
  var info = url.parse("about:boop");
  test.assertEqual(info.scheme, "about");
  test.assertEqual(info.host, null);
  test.assertEqual(info.port, null);
  test.assertEqual(info.userPass, null);
  test.assertEqual(info.path, "boop");
};

exports.testToFilename = function(test) {
  test.assertRaises(
    function() { url.toFilename("resource://nonexistent"); },
    "resource does not exist: resource://nonexistent/",
    "url.toFilename() on nonexistent resources should throw"
  );

  test.assertNotEqual(url.toFilename("resource://gre/modules/"), null,
                      "url.toFilename() on resource: URIs should work");

  test.assertRaises(
    function() { url.toFilename("http://foo.com/"); },
    "cannot map to filename: http://foo.com/",
    "url.toFilename() on http: URIs should raise error"
  );
};

exports.testFromFilename = function(test) {
  var fileUrl = url.fromFilename(url.toFilename(__url__));
  test.assertEqual(url.parse(fileUrl).scheme, 'file',
                   'url.toFilename() should return a file: url');
  test.assertEqual(url.fromFilename(url.toFilename(fileUrl)),
                   fileUrl);
};
