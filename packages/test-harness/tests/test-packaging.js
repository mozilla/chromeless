var url = require("url");

exports.testPackaging = function(test) {
  test.assertEqual(packaging.options.main,
                   'run-tests',
                   "main program should be the test harness");

  var harness = Cc[packaging.options.bootstrap.contractID]
                .getService().wrappedJSObject;

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
  test.assertEqual(file.read(sample), "this is sample data.",
		   "packaging data should be available");
};
