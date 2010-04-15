var errors = require("errors");

exports.testCatchAndLog = function(test) {
  var caught = [];
  function dummyLog(e) { caught.push(e); }

  var wrapped = errors.catchAndLog(function(x) {
                                     throw Error("blah" + x + this);
                                   },
                                   "boop",
                                   dummyLog);
  test.assertEqual(wrapped.call("hi", 1), "boop",
                   "exceptions should be trapped, def. resp. returned");
  test.assertEqual(caught.length, 1,
                   "logging function should be called");
  test.assertEqual(caught[0].message, "blah1hi",
                   "args and this should be passed to wrapped func");
};

exports.testCatchAndLogProps = function(test) {
  var caught = [];
  function dummyLog(e) { caught.push(e); }

  var thing = {
    foo: function(x) { throw Error("nowai" + x); },
    bar: function() { throw Error("blah"); },
    baz: function() { throw Error("fnarg"); }
  };

  errors.catchAndLogProps(thing, "foo", "ugh", dummyLog);

  test.assertEqual(thing.foo(1), "ugh",
                   "props should be wrapped");
  test.assertEqual(caught.length, 1,
                   "logging function should be called");
  test.assertEqual(caught[0].message, "nowai1",
                   "args should be passed to wrapped func");
  test.assertRaises(function() { thing.bar(); },
                    "blah",
                    "non-wrapped props should be wrapped");

  errors.catchAndLogProps(thing, ["bar", "baz"], "err", dummyLog);
  test.assert((thing.bar() == thing.baz()) &&
              (thing.bar() == "err"),
              "multiple props should be wrapped if array passed in");
};
