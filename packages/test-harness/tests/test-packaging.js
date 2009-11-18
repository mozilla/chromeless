exports.testPackaging = function(test) {
  test.assertEqual(packaging.options.main,
                   'run-tests');
  var harness = Cc[packaging.options.bootstrap.contractID]
                .getService().wrappedJSObject;
  test.assertNotEqual(harness.loader, undefined);
  test.assertEqual(JSON.stringify(harness.options),
                   JSON.stringify(packaging.options));
};
