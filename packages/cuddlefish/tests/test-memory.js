var memory = require("memory");

exports.testMemory = function(test) {
  var obj = {};
  memory.track(obj, "testMemory.testObj");
  var objs = memory.getObjects("testMemory.testObj");
  test.assertEqual(objs[0].weakref.get(), obj);
  obj = null;
  memory.gc();
  test.assertEqual(objs[0].weakref.get(), null);
};
