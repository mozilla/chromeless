var Dictionary = require("dictionary").Dictionary;

exports.testSetAndGet = function(test) {
    var dict = new Dictionary();
    var a = {foo: "bar"};
    var b = {baz: "blah"};
    var c = {};
    dict.set("hi", "there");
    dict.set(a, b);
    test.assertEqual(dict.get("hi"), "there");
    test.assertEqual(dict.get(a), b);
    dict.set(a, c);
    test.assertEqual(dict.get(a), c);
    test.assertEqual(dict.length, 2);
};

exports.testRemove = function(test) {
  var dict = new Dictionary();
  var a = {a: 1};
  dict.set(1, 2);
  dict.set(3, 4);
  dict.set(a, 1);
  dict.remove(3);
  test.assertEqual(dict.get(3), null);
  test.assertEqual(dict.length, 2);
  test.assertRaises(function() { dict.remove(3); },
                    "object not in dictionary: 3");
};
