var global = this;

exports.testGlobals = function(test) {
  test.assertMatches(global.__url__, /test-globals\.js$/,
                     "__url__ global should contain filename");

  ['console', 'memory'].forEach(
    function(name) {
      test.assertNotEqual(global[name], undefined,
                          name + " should be defined");
    });
};
