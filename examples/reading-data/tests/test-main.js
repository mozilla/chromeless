const m = require("main");
const self = require("self");

exports.test_replace = function(test) {
    const input = "Hello World";
    const output = m.replace_mom(input);
    test.assertEqual(output, "Hello Mom");
    var callbacks = {quit: function() {} };
    m.main({}, callbacks); // make sure it doesn't crash
}

exports.test_id = function(test) {
    /* the id is randomly generated during tests, so we cannot compare it
       against anything in particular. Just assert that it is not empty. */
    test.assert(self.id.length > 0);
    test.assertEqual(self.data.url("sample.html"),
                     "resource://reading-data-reading-data-data/sample.html");
}
