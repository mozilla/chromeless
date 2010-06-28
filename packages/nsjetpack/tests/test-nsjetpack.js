exports.testNsJetpack = function(test) {
  var nsjetpack = require("nsjetpack");
  try {
    test.assertNotEqual(nsjetpack.get(), undefined);
  } catch (e if e.message &&
           /component not available for OS\/ABI/.test(e.message)) {
    // If the binary component isn't available, just skip these
    // tests.
    test.pass("Binary component does not exist.  Skipping tests.");
    return;
  }
};
