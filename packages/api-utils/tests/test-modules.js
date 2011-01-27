
// define() that exports a function as the module value,
// specifying a module name.
exports.testDefExport = function(test) {
  var add = require('modules/add');
  test.assertEqual(add(1, 1), 2, 'Named define() exporting a function');
};

// define() that exports function as a value, but is anonymous
exports.testAnonDefExport = function (test) {
  var subtract = require('modules/subtract');
  test.assertEqual(subtract(4, 2), 2,
                   'Anonymous define() exporting a function');
}

// using require([], function () {}) to load modules.
exports.testSimpleRequire = function (test) {
  require(['modules/blue', 'modules/orange'], function (blue, orange) {
    test.assertEqual(blue.name, 'blue', 'Simple require for blue');
    test.assertEqual(orange.name, 'orange', 'Simple require for orange');
    test.assertEqual(orange.parentType, 'color',
                     'Simple require dependency check for orange');
  });
}

// using nested require([]) calls.
exports.testSimpleRequireNested = function (test) {
  require(['modules/blue', 'modules/orange', 'modules/green'],
  function (blue, orange, green) {

    require(['modules/orange', 'modules/red'], function (orange, red) {
      test.assertEqual(red.name, 'red', 'Simple require for red');
      test.assertEqual(red.parentType, 'color',
                       'Simple require dependency check for red');
      test.assertEqual(blue.name, 'blue', 'Simple require for blue');
      test.assertEqual(orange.name, 'orange', 'Simple require for orange');
      test.assertEqual(orange.parentType, 'color',
                       'Simple require dependency check for orange');
      test.assertEqual(green.name, 'green', 'Simple require for green');
      test.assertEqual(green.parentType, 'color',
                       'Simple require dependency check for green');
    });

  });
}

// requiring a traditional module, that uses async, that use traditional and
// async, with a circular reference
exports.testMixedCircular = function (test) {
  var t = require('modules/traditional1');
  test.assertEqual(t.name, 'traditional1', 'Testing name');
  test.assertEqual(t.traditional2Name, 'traditional2',
                   'Testing dependent name');
  test.assertEqual(t.traditional1Name, 'traditional1', 'Testing circular name');
  test.assertEqual(t.async2Name, 'async2', 'Testing async2 name');
  test.assertEqual(t.async2Traditional2Name, 'traditional2',
                   'Testing nested traditional2 name');
}

// Testing define()(function(require) {}) with some that use exports,
// some that use return.
exports.testAnonExportsReturn = function (test) {
  var lion = require('modules/lion');
  require(['modules/tiger', 'modules/cheetah'], function (tiger, cheetah) {
    test.assertEqual('lion', lion, 'Check lion name');
    test.assertEqual('tiger', tiger.name, 'Check tiger name');
    test.assertEqual('cat', tiger.type, 'Check tiger type');
    test.assertEqual('cheetah', cheetah(), 'Check cheetah name');
  });
}

// circular dependency
exports.testCircular = function (test) {
  var pollux = require('modules/pollux'),
      castor = require('modules/castor');

  test.assertEqual(pollux.name, 'pollux', 'Pollux\'s name');
  test.assertEqual(pollux.getCastorName(),
                   'castor', 'Castor\'s name from Pollux.');
  test.assertEqual(castor.name, 'castor', 'Castor\'s name');
  test.assertEqual(castor.getPolluxName(), 'pollux',
                   'Pollux\'s name from Castor.');
}

// test a bad module that asks for exports but also does a define() return
exports.testBadExportAndReturn = function (test) {
  var passed = false;
  try {
    var bad = require('modules/badExportAndReturn');
  } catch(e) {
    passed = /cannot use exports and also return/.test(e.toString());
  }
  test.assertEqual(passed, true, 'Make sure exports and return fail');
}

// test a bad circular dependency, where an exported value is needed, but
// the return value happens too late, a module already asked for the exported
// value.
exports.testBadExportAndReturn = function (test) {
  var passed = false;
  try {
    var bad = require('modules/badFirst');
  } catch(e) {
    passed = /after another module has referenced its exported value/
             .test(e.toString());
  }
  test.assertEqual(passed, true, 'Make sure return after an exported ' +
                                 'value is grabbed by another module fails.');
}

// test a bad name in a define() call, where it does not match the expected
// name for the module.
exports.testBadDefineName = function (test) {
  var passed = false;
  try {
    var sheep = require('modules/sheep');
  } catch(e) {
    passed = /Mismatched define/.test(e.toString());
  }
  test.assertEqual(passed, true, 'Make sure name in define call matches ' +
                                 'the expected name for the module.');
}

// only allow one define call per file.
exports.testOneDefine = function (test) {
  var passed = false;
  try {
    var dupe = require('modules/dupe');
  } catch(e) {
    passed = /Only one call to define/.test(e.toString());
  }
  test.assertEqual(passed, true, 'Only allow one define call per module');
}

// only allow one define call per file, testing a bad nested define call.
exports.testOneDefineNested = function (test) {
  var passed = false;
  try {
    var dupe = require('modules/dupeNested');
  } catch(e) {
    passed = /Only one call to define/.test(e.toString());
  }
  test.assertEqual(passed, true, 'Only allow one define call per module');
}
