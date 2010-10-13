var url = require("url");

exports.testResolve = function(test) {
  test.assertEqual(url.URL("bar", "http://www.foo.com/").toString(),
                   "http://www.foo.com/bar");

  test.assertEqual(url.URL("bar", "http://www.foo.com"),
                   "http://www.foo.com/bar");

  test.assertEqual(url.URL("http://bar.com/", "http://foo.com/"),
                   "http://bar.com/",
                   "relative should override base");

  test.assertRaises(function() { url.URL("blah"); },
                    "malformed URI: blah",
                    "url.resolve() should throw malformed URI on base");

  test.assertRaises(function() { url.URL("chrome://global"); },
                    "invalid URI: chrome://global",
                    "url.resolve() should throw invalid URI on base");

  test.assertRaises(function() { url.URL("chrome://foo/bar"); },
                    "invalid URI: chrome://foo/bar",
                    "url.resolve() should throw on bad chrome URI");

  test.assertEqual(url.URL("", "http://www.foo.com"),
                   "http://www.foo.com/",
                   "url.resolve() should add slash to end of domain");
};

exports.testParseHttp = function(test) {
  var info = url.URL("http://foo.com/bar");
  test.assertEqual(info.scheme, "http");
  test.assertEqual(info.host, "foo.com");
  test.assertEqual(info.port, null);
  test.assertEqual(info.userPass, null);
  test.assertEqual(info.path, "/bar");
};

exports.testParseChrome = function(test) {
  var info = url.URL("chrome://global/content/blah");
  test.assertEqual(info.scheme, "chrome");
  test.assertEqual(info.host, "global");
  test.assertEqual(info.port, null);
  test.assertEqual(info.userPass, null);
  test.assertEqual(info.path, "/content/blah");
};

exports.testParseAbout = function(test) {
  var info = url.URL("about:boop");
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

  test.assertMatches(url.toFilename(__url__),
                     /.*test-url\.js$/,
                     "url.toFilename() on resource: URIs should work");

  test.assertRaises(
    function() { url.toFilename("http://foo.com/"); },
    "cannot map to filename: http://foo.com/",
    "url.toFilename() on http: URIs should raise error"
  );

  try {
    test.assertMatches(
      url.toFilename("chrome://global/content/console.xul"),
      /.*console\.xul$/,
      "url.toFilename() w/ console.xul works when it maps to filesystem"
    );
  } catch (e) {
    if (/chrome url isn\'t on filesystem/.test(e.message))
      test.pass("accessing console.xul in jar raises exception");
    else
      test.fail("accessing console.xul raises " + e);
  }

  // TODO: Are there any chrome URLs that we're certain exist on the
  // filesystem?
  // test.assertMatches(url.toFilename("chrome://myapp/content/main.js"),
  //                    /.*main\.js$/);
};

exports.testFromFilename = function(test) {
  var fileUrl = url.fromFilename(url.toFilename(__url__));
  test.assertEqual(url.URL(fileUrl).scheme, 'file',
                   'url.toFilename() should return a file: url');
  test.assertEqual(url.fromFilename(url.toFilename(fileUrl)),
                   fileUrl);
};

exports.testURL = function(test) {
  let URL = url.URL;
  test.assert(URL("h:foo") instanceof URL, "instance is of correct type");
  test.assertRaises(function() URL(),
                    "malformed URI: undefined",
                    "url.URL should throw on undefined");
  test.assertRaises(function() URL(""),
                    "malformed URI: ",
                    "url.URL should throw on empty string");
  test.assertRaises(function() URL("foo"),
                    "malformed URI: foo",
                    "url.URL should throw on invalid URI");
  test.assert(URL("h:foo").scheme, "has scheme");
  test.assertEqual(URL("h:foo").toString(),
                   "h:foo",
                   "toString should roundtrip");
  // test relative + base
  test.assertEqual(URL("mypath", "http://foo").toString(), 
                   "http://foo/mypath",
                   "relative URL resolved to base");
  // test relative + no base
  test.assertRaises(function() URL("path").toString(), 
                    "malformed URI: path",
                    "no base for relative URI should throw");

  let a = URL("h:foo");
  let b = URL(a);
  test.assertEqual(b.toString(),
                   "h:foo",
                   "a URL can be initialized from another URL");
  test.assert(a !== b,
              "a URL initialized from another URL is not the same object");
  test.assert(a == "h:foo",
              "toString is implicit when a URL is compared to a string via ==");
  test.assert(a + "" === "h:foo",
              "toString is implicit when a URL is concatenated to a string");
};
