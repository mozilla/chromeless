exports.testModuleOverrides = function(test) {
  var options = {
    moduleOverrides: {
      'unit-test': {
        foo: 5
      }
    }
  };
  var loader = test.makeSandboxedLoader(options);
  test.assertEqual(loader.require('unit-test').foo, 5,
                   "options.moduleOverrides works");
  loader.unload();
};
