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

exports.testPackagingGetModuleInfo = function(test) {
  var loader = require("parent-loader");
  var runTestsUrl = loader.fs.resolveModule(null, 'run-tests');
  var info = packaging.getModuleInfo(runTestsUrl);
  test.assertEqual(info.name, 'run-tests',
                   'info.name works');
  test.assertEqual(info.packageName, 'test-harness',
                   'info.packageName works');
  test.assertEqual(info.packageData, packaging.getURLForData(""),
                   'info.packageData works');
  test.assert("observer-service" in info.dependencies);
  test.assertEqual(info.dependencies["observer-service"].url,
                   "resource://testpkgs-api-utils-lib/observer-service.js");
  test.assert(info.needsChrome,
              'module "run-tests" needs chrome');

  var myInfo = packaging.getModuleInfo(__url__);
  test.assert('dependencies' in myInfo,
              'modules that are tests contain dependency info');
  test.assert(myInfo.needsChrome,
              'modules that are tests contain needsChrome info');
};
