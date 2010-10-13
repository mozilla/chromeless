var version = require("version");

exports.testVersion = function(test) {
  var trueStatements = ["1.0 > 0.5",
                        "1.0 >= 0.5",
                        "1.0 >= 1.0",
                        "1.0 != 2.0",
                        "1.0 == 1.0",
                        "1.0 < 2.0",
                        "1.0 <= 2.0",
                        "1.0 <= 1.0"];
  var falseStatements = ["1.0 > 2.0",
                         "1.0 > 1.0",
                        "1.0 >= 2.0",
                        "1.0 != 1.0",
                        "1.0 == 2.0",
                        "2.0 < 1.0",
                        "2.0 <= 1.0"];

  trueStatements.forEach(function(stmt) {
    test.assertEqual(version.is(stmt), true, "'" + stmt + "' is true");
  });

  falseStatements.forEach(function(stmt) {
    test.assertEqual(version.is(stmt), false, "'" + stmt + "' is false");
  });

  test.assertRaises(function() { version.is("egae"); },
                    "could not parse: egae");
  test.assertRaises(function() { version.is("1.3 boop 2.4"); },
                    "unknown operator: boop");
  test.assertRaises(function() { version.is(); },
                    "not all arguments are strings");
};
