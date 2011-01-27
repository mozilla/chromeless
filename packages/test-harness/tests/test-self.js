var self = require("self");

exports.test_ID = function(test) {
    var id = self.id;
    // We can't assert anything about the ID inside the unit test right now,
    // because the ID we get depends upon how the test was invoked. The idea
    // is that it is supposed to come from the main top-level package's
    // package.json file, from the "id" key.
    //test.assertEqual(self.id, "jid-12345");
    test.assert(id.length > 0);
}

exports.test_data = function(test) {
    const foo = self.data.load("sample.txt");
    test.assertEqual(foo, "this is sample data.\r\n");
    const foo_url = self.data.url("sample.txt");
    // Likewise, we can't assert anything about the full URL, because that
    // depends on self.id . We can only assert that it ends in the right
    // thing.
    //console.log("URL IS " + foo_url);
    test.assertEqual(/\/sample.txt$/.test(foo_url), true);
}
