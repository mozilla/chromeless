exports.testLoader = function(test) {
  var prints = [];
  function print(message) {
    prints.push(message);
  }

  var loader = test.makeSandboxedLoader({print: print});

  test.pass("loader instantiates within a securablemodule");

  loader.runScript("console.log('testing', 1, [2, 3, 4])");

  test.assertEqual(prints[0], "info: testing 1 2,3,4\n",
                   "global console must work.");

  var unloadCalled = false;

  loader.require("unload").when(function() { unloadCalled = true; });
  loader.unload();
  test.assertEqual(unloadCalled, true, "loader.unload() must work.");

  loader.runScript("memory.track({}, 'blah');");
  test.assertEqual([name for each (name in loader.memory.getBins())
                         if (name == "blah")].length,
                   1,
                   "global memory must work.");

  loader.unload();
  test.assertEqual([name for each (name in loader.memory.getBins())
                         if (name == "blah")].length,
                   0,
                   "global memory must empty after unload.");
};
