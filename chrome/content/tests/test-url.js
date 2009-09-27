exports.testUrl = function(test) {
  var url = require("url");

  test.assertEqual(url.resolve("http://www.foo.com/", "bar"),
                   "http://www.foo.com/bar");

  test.assertEqual(url.resolve("http://www.foo.com", "bar"),
                   "http://www.foo.com/bar");
};
