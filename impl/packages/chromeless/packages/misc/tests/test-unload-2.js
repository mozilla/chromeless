var unload2 = require("unload-2");

exports.testUnloading = function(test) {
  var loader = test.makeSandboxedLoader();
  var ul2 = loader.require("unload-2");
  var unloadCalled = 0;
  function unload() { unloadCalled++; }
  var obj1 = {};
  var obj2 = {};
  ul2.addMethod(obj1, unload);
  ul2.addMethod(obj2, unload);
  loader.unload();
  test.assertEqual(unloadCalled, 2,
                   "All unloaders are called on unload.");
};

exports.testAddMethod = function(test) {
  var obj = {unloadCalled: 0};
  function unloadObj() { this.unloadCalled++; }

  unload2.addMethod(obj, unloadObj);

  obj.unload();
  test.assertEqual(obj.unloadCalled, 1,
                   "unloader function should be called");
  obj.unload();
  test.assertEqual(obj.unloadCalled, 1,
                   "unloader func should not be called more than once");
};

exports.testEnsure = function(test) {
  test.assertRaises(function() { unload2.ensure({}); },
                    "object has no 'unload' property",
                    "passing obj with no unload prop should fail");

  var called = 0;
  var obj = {unload: function() { called++; }};

  unload2.ensure(obj);
  obj.unload();
  test.assertEqual(called, 1,
                   "unload() should be called");
  obj.unload();
  test.assertEqual(called, 1,
                   "unload() should be called only once");
};
