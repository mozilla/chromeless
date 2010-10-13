var memory = require("memory");

exports.testMemory = function(test) {
  test.pass("Skipping this test until Gecko memory debugging issues " +
            "are resolved (see bug 592774).");
  return;

  var obj = {};
  memory.track(obj, "testMemory.testObj");
  var objs = memory.getObjects("testMemory.testObj");
  test.assertEqual(objs[0].weakref.get(), obj);
  obj = null;
  memory.gc();
  test.assertEqual(objs[0].weakref.get(), null);
};
