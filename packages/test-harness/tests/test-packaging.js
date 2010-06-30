var url = require("url");
var file = require("file");
var {Cm,Ci} = require("chrome");

exports.testPackaging = function(test) {
  test.assertEqual(packaging.options.main,
                   'run-tests',
                   "main program should be the test harness");

  var factory = Cm.getClassObjectByContractID(
    packaging.options.bootstrap.contractID,
    Ci.nsIFactory
  );

  var harness = factory.wrappedJSObject.singleton;

  test.assertEqual(packaging.harnessService, harness);

  test.assertNotEqual(harness.loader, undefined,
                      "bootstrap component should be available");

  test.assertEqual(JSON.stringify(harness.options),
                   JSON.stringify(packaging.options),
                   ("bootstrap component options should be identical " +
                    "to packaging.options"));

  test.assertEqual(packaging.options.metadata['test-harness'].author,
                   'Atul Varma (http://toolness.com/)',
                   "packaging metadata should be available");

  var sample = url.toFilename(packaging.getURLForData("sample.txt"));
  test.assertEqual(file.read(sample), "this is sample data.\r\n",
		   "packaging data should be available");
};
