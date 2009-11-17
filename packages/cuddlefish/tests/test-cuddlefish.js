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

  var unloadsCalled = '';

  loader.require("unload").when(function() { unloadsCalled += 'a'; });
  loader.require("unload").when(function() { unloadsCalled += 'b'; });

  loader.unload();

  test.assertEqual(unloadsCalled, 'ba',
                   "loader.unload() must call cb's in LIFO order.");

  loader = test.makeSandboxedLoader();

  loader.runScript("memory.track({}, 'blah');");

  test.assertEqual([name for each (name in loader.memory.getBins())
                         if (name == "blah")].length,
                   1,
                   "global memory must work.");

  loader.unload();
};
