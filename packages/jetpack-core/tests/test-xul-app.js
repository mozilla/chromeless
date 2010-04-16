var xulApp = require("xul-app");

exports.testXulApp = function(test) {
  test.assertEqual(typeof(xulApp.ID), "string",
                   "ID is a string");
  test.assertEqual(typeof(xulApp.name), "string",
                   "name is a string");
  test.assertEqual(typeof(xulApp.version), "string",
                   "version is a string");
  test.assertEqual(typeof(xulApp.platformVersion), "string",
                   "platformVersion is a string");

  test.assertRaises(function() { xulApp.is("blargy"); },
                    "Unkown Mozilla Application: blargy",
                    "is() throws error on bad app name");
  test.assertRaises(function() { xulApp.isOneOf(["blargy"]); },
                    "Unkown Mozilla Application: blargy",
                    "isOneOf() throws error on bad app name");

  function testSupport(name) {
    var item = xulApp.is(name);
    test.assert(item === true || item === false,
                "is('" + name + "') is true or false.");
  }

  var apps = ["Firefox", "Mozilla", "Sunbird", "SeaMonkey",
              "Fennec", "Thunderbird"];

  apps.forEach(function(name) { testSupport(name); });

  test.assert(xulApp.isOneOf(apps) == true ||
              xulApp.isOneOf(apps) == false,
              "isOneOf() returns true or false.");
};
