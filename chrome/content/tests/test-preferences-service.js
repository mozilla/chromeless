var prefs = require("preferences-service");

exports.testReset = function(test) {
  prefs.reset("blah");
  test.assertEqual(prefs.has("blah"), false);
  test.assertEqual(prefs.isSet("blah"), false);
  prefs.set("blah", 5);
  test.assertEqual(prefs.has("blah"), true);
  test.assertEqual(prefs.isSet("blah"), true);
};

exports.testGetAndSet = function(test) {
  prefs.set("test_set_get_pref.integer", 1);
  test.assertEqual(prefs.get("test_set_get_pref.integer"), 1,
                   "set/get integer preference should work");

  prefs.set("test_set_get_number_pref", 3.14159);
  test.assertEqual(prefs.get("test_set_get_number_pref"), 3,
                   "setting a float preference should save as integer");

  test.assertRaises(
    function() { prefs.set("test_set_get_number_pref", Math.pow(2, 31)); },
    ("you cannot set the test_set_get_number_pref pref to the number " +
     "2147483648, as number pref values must be in the signed 32-bit " +
     "integer range -(2^31-1) to 2^31-1.  To store numbers outside that " +
     "range, store them as strings."),
    "setting an int pref outside the range -(2^31-1) to 2^31-1 shouldn't work"
  );

  prefs.set("test_set_get_pref.string", "foo");
  test.assertEqual(prefs.get("test_set_get_pref.string"), "foo",
                   "set/get string preference should work");

  prefs.set("test_set_get_pref.boolean", true);
  test.assertEqual(prefs.get("test_set_get_pref.boolean"), true,
                   "set/get boolean preference should work");

  prefs.set("test_set_get_unicode_pref", String.fromCharCode(960));
  test.assertEqual(prefs.get("test_set_get_unicode_pref"),
                   String.fromCharCode(960),
                   "set/get unicode preference should work");

  var unsupportedValues = [null, [], undefined];
  unsupportedValues.forEach(
    function(value) {
      test.assertRaises(
        function() { prefs.set("test_set_pref", value); },
        ("can't set pref test_set_pref to value '" + value + "'; " +
         "it isn't a String, Number, or Boolean"),
        "Setting a pref to " + uneval(value) + " should raise error"
      );
    });
};
