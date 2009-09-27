exports.testUrl = function(test) {
  var url = require("url");

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

  test.assertEqual(url.resolve("http://www.foo.com", ""),
                   "http://www.foo.com/",
                   "url.resolve() should add slash to end of domain");
};
