'use strict';

exports['test:add'] = function(test) {
  function Class() {}
  let fixture = require('utils/registry').Registry(Class);
  let isAddEmitted = false;
  fixture.on('add', function(item) {
    test.assert(
      item instanceof Class,
      'if object added is not an instance should construct instance from it'
    );
    test.assert(
      fixture.has(item),
      'callback is called after instance is added'
    );
    test.assert(
      !isAddEmitted,
      'callback should be called for the same item only once'
    );
    isAddEmitted = true;
  });

  let object = fixture.add({});
  fixture.add(object);
};

exports['test:remove'] = function(test) {
  function Class() {}
  let fixture = require('utils/registry').Registry(Class);
  fixture.on('remove', function(item) {
     test.assert(
      item instanceof Class,
      'if object removed can be only instance of Class'
    );
    test.assert(
      fixture.has(item),
      'callback is called before instance is removed'
    );
    test.assert(
      !isRemoveEmitted,
      'callback should be called for the same item only once'
    );
    isRemoveEmitted = true;
  });

  fixture.remove({});
  let object = fixture.add({});
  fixture.remove(object);
  fixture.remove(object);
};

exports['test:items'] = function(test) {
  function Class() {}
  let fixture = require('utils/registry').Registry(Class),
      actual,
      times = 0;

  function testItem(item) {
    times ++;
    test.assertEqual(
      actual,
      item,
      'item should match actual item being added/removed'
    );
  }
  
  actual = fixture.add({});

  fixture.on('add', testItem);
  fixture.on('remove', testItem);
  
  fixture.remove(actual);
  fixture.remove(fixture.add(actual = new Class()));
  test.assertEqual(3, times, 'should notify listeners on each call');
}

