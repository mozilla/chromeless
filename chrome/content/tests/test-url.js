exports.testUrl = function(test) {
  var url = require("url");

  test.assertEqual(url.resolve("http://www.foo.com/", "bar"),
                   "http://www.foo.com/bar");

  test.assertEqual(url.resolve("http://www.foo.com", "bar"),
                   "http://www.foo.com/bar");

  test.assertRaises(function() { url.resolve("blah"); },
                    "malformed URI: blah",
                    "url.resolve() should throw malformed URI on base");
};
