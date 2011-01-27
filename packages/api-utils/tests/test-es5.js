"use strict";

/**
 * Checks whether or not implementation is native
 * @param {Function} $
 *    function to check
 * @returns {Boolean}
 *    true if native false if custom
 */
function isNative($)
  /\[native code\]/g.test(Function.prototype.toString.call($));

/**
 * Checks weather or not all the elements from array `a` is contained by
 * array `b` and wise versa.
 * @param {Array} a
 * @param {Array} b
 * @returns {Boolean}
 */
function containsSameElements(a, b) {
  if (
    typeof a !== typeof b ||
    Object.prototype.toString.call(a) !== '[object Array]'
  ) return false;
  if (a.length !== b.length) return false;
  for (let i = 0, ii = a.length; i < ii; i++)
    if (0 > b.indexOf(a[i])) return false;
  return true;
}

/**
 * returns array containing names of all enumerable properties of the
 * `object`.
 * @param {Object} object
 * @returns {Array}
 */
function keys(object) {
  let result = [];
  for (let key in object) result.push(key);
  return result;
}

if (!isNative(Array.isArray)) {
  exports['test:[] is Array'] = function (test) {
    test.assertEqual(true, Array.isArray([]), '[] is an array');
  };
  exports['test:new Array() is an Array'] = function (test) {
    test.assertEqual(
      true,
      Array.isArray(new Array()),
      'new Array() is an Array'
    )
  };
  exports['test:arguments is not Array'] = function (test) {
    var args = (function () {return arguments})();
    test.assertEqual(false, Array.isArray(args), 'arguments is not an array');
  };
  exports['test:fake object is not Array'] = function (test) {
    test.assertEqual(
      false,
      Array.isArray({"length": 0}),
      'fake object is not an array'
    );
  };
}

if (!isNative(Object.getPrototypeOf)) {
  exports['test:getPrototypeOf for {}'] = function(test) {
    test.assertEqual(Object.getPrototypeOf({}), Object.prototype);
  };
  exports['test:getPrototypeOf for function'] = function(test) {
    test.assertEqual(Object.getPrototypeOf(function() 1), Function.prototype);
  };
  exports['test:getPrototypeOf for custom object'] = function(test) {
    test.assertEqual(Object.getPrototypeOf({ __proto__: null }), null)
  };
  exports['test:getPrototypeOf for class'] = function(test) {
    function Ancestor() {};
    function Class() {};
    Class.prototype = new Ancestor();
    Class.prototype.name = 'myname';
    test.assertEqual(
      Object.getPrototypeOf(new Class()),
      Class.prototype,
      'proto of instance must be prototype of class'
    );
    test.assertEqual(
      Object.getPrototypeOf(Class.prototype),
      Ancestor.prototype,
      'proto of class prototype must be prototype of ancestor class'
    );
  };
}

if (!isNative(Object.preventExtensions)) {
  exports['test:preventExtensions'] = function(test) {
    test.assertEqual(
      false,
      Object.isExtensible(Object.preventExtensions({})),
      'should be inextensible if preventExtensions was called'
    );
    test.assertEqual(
      true,
      Object.isExtensible({}),
      'should be extensible if preventExtensions was not called'
    );
  };
}

if (!isNative(Object.seal)) {
  exports['test:seal'] = function(test) {
    test.assertEqual(
      true,
      Object.isSealed(Object.seal({})),
      'should be sealed if seal was called'
    );
    test.assertEqual(
      false,
      Object.isSealed({}),
      'should not be sealed if seal was not called'
    );
  };
}

if (!isNative(Object.freeze)) {
  exports['test:freeze'] = function(test) {
    test.assertEqual(
      true,
      Object.isFrozen(Object.freeze({})),
      'should be frozen if freeze was called'
    );
    test.assertEqual(
      false,
      Object.isFrozen({}),
      'should not be frozen if freeze was not called'
    );
  };
}

if (!isNative(Object.keys)) {
  exports['test:keys|getOwnPropertyNames'] = function(test) {
    let object = Object.create({ trap: 'oops!' }, {
      valueEnumerable: {
        value: 5,
        enumerable: true,
      },
      getEnumerable: {
        get: function() 'test',
        enumerable: true,
      },
      getNotSpecified: {
        get: function() 'Object.keys will skip'
      },
      enumerableNotSpecified: {
        value: 'Object.keys will skip'
      },
      enumerableFalse: {
        value: 'Object.keys will skip',
        enumerable: false
      }
    });

    test.assertEqual(
      true,
      containsSameElements(
        Object.keys(object),
        ['valueEnumerable', 'getEnumerable']
      ),
      'should return only own enumerable property names'
    );
    test.assertEqual(
        true,
        containsSameElements(
          Object.getOwnPropertyNames(object),
          [
            'valueEnumerable', 'getEnumerable', 'getNotSpecified',
            'enumerableNotSpecified', 'enumerableFalse'
          ]
        ),
        'should return own property names non-enumerable ones as well'
      );
  };
}

if (!isNative(Object.getOwnPropertyDescriptor)) {
  exports['test:getOwnPropertyDescriptor'] = function(test) {
    let object = {
      get get() 'getter only',
      get get_set() 'getter',
      set get_set(value) 'setter',
      property: 'just value'
    };
    let get = Object.getOwnPropertyDescriptor(object, 'get');
    test.assertEqual(
      object.__lookupGetter__('get'),
      get.get,
      'setter must be one from descriptor if it has one'
    );
    test.assertEqual(
      object.__lookupSetter__('get'),
      get.set,
      'setter must be one from descriptor if it has one'
    );
    test.assertEqual(true, get.enumerable, 'must be enumerable by default');
    test.assertEqual(true, get.configurable, 'must be configurable by default');
    test.assertEqual(
      false,
      'writable' in get,
      'must not have writable property in getter / setter descriptor'
    );

    let get_set = Object.getOwnPropertyDescriptor(object, 'get_set');
    test.assertEqual(
      object.__lookupGetter__('get_set'),
      get_set.get,
      'must be a getter from descriptor'
    );
    test.assertEqual(
      object.__lookupSetter__('get_set'),
      get_set.set,
      'must be a setter from descriptor'
    );
    test.assertEqual(
      true,
      get_set.enumerable,
      'must be enumerable by default'
    );
    test.assertEqual(
      true,
      get_set.configurable,
      'must be configurable by default'
    );
    test.assertNotEqual(
      true,
      'writable' in get_set,
      'must not have writable property in getter / setter descriptor'
    );

    let property = Object.getOwnPropertyDescriptor(object, 'property');
    test.assertEqual(undefined, property.get, 'must not have a getter');
    test.assertEqual(undefined, property.set, 'must not have a setter');
    test.assertEqual(
      true,
      property.enumerable,
      'must be enumerable by default'
    );
    test.assertEqual(
      true,
      property.configurable,
      'must be configurable by default'
    );
    test.assertEqual(
      true,
      property.writable,
      'must be writable by default'
    );
  }
  exports['test:getOwnPropertyDescriptor getter'] = function(test) {
    let object = {}, threw;
    Object.defineProperty(object, 'get', {
        get: function() 'getter'
    });
    test.assertEqual('getter', object.get, 'must be getter from descriptor');
    try { object.get = 'override'; } catch(e) { threw = e; }
    test.assertNotEqual(
      'override',
      object.get,
      'getter can\'t be overridden by property assignment'
    );
    test.assertNotEqual(
      undefined,
      threw,
      'assignment to property with getter only should throw TypeError'
    );
  }
  exports['test:getOwnPropertyDescriptor getter/setter'] = function(test) {
    let object = {}, val = 'test';
    Object.defineProperty(object, 'test', {
      get: function() val,
      set: function(value) val = value
    });
    test.assertEqual('test', object.test, 'property access must call getter');
    object.test = 'override';
    test.assertEqual(
      'override',
      object.test,
      'property assignment must call setter'
    );
  }
  exports['test:getOwnPropertyDescriptor (writable,configurable,enumerable)'] =
    function(test) {
      let object = {}
      Object.defineProperty(object, 'test', {
        value: 'test',
        writable: true,
        configurable: true
      });
      test.assertEqual(
        'test',
        object.test,
        'value must match one from descriptor'
      );
      object.test = 'override'
      test.assertEqual(
        'override',
        object.test,
        'property assignment should override property value'
      );
  }
  exports['test:getOwnPropertyDescriptor value(configurable,enumerable)'] = function(test) {
    let object = {}, threw = false;
    Object.defineProperty(object, 'test', {
      value: 'test',
      writable: false,
      configurable: true,
      enumerable: true
    });
    test.assertEqual(
      'test',
      object.test,
      'value should match one from descriptor'
    )
    test.assertRaises(
      function() object.test = 'override',
      /read\-only/g,
      'should throw on assignment to a non writable properties'
    );
    test.assertEqual(
      'test',
      object.test,
      'value should match one from descriptor'
    )
  }
}

if (!isNative(Object.defineProperties)) {
  exports['test:defineProperties'] = function(test) {
    let object = {}, threw = false
    Object.defineProperties(object, {
      test: {
        value: 'test',
        writable: true,
        configurable: true
      },
      getter: {
        get: function() 'getter'
      },
      get_set: {
        get: function() this._get_set,
        set: function(value) this._get_set = value
      },
      non_writable: {
        value: 'readOnly',
        writable: false,
        configurable: false
      }
    })
    test.assertEqual('test', object.test, 'should match one in descriptor');
    object.test = 'override'
    test.assertEqual(
      'override',
      object.test,
      'assignment to property must override property value'
    );
    test.assertEqual(
      'getter',
      object.getter,
      'should be a getter from descriptor'
    );
    try { object.getter = 'override'; } catch(e) { threw = true }
    test.assertEqual(
      true,
      threw,
      'assignment to a property with a getter only must throw'
     );
    test.assertEqual('getter', object.getter);

    test.assertEqual(undefined, object.get_set);
    object.get_set = 'override'
    test.assertEqual('override', object.get_set);

    test.assertEqual('readOnly', object.non_writable);
    test.assertRaises(
      function() object.non_writable = 'override',
      /read\-only/g,
      'should throw on assignment to a non writable properties'
    );
  }
}

if (!isNative(Object.create)) {
  exports['test:create'] = function(test) {
    let threw = false, proto = { test: 6, non_writable: 7, inherit: 'inherit' };
    let object = Object.create(proto, {
      test: {
        value: 'test',
        writable: true,
        configurable: true
      },
      getter: {
        get: function() 'getter'
      },
      get_set: {
        get: function() this._get_set,
        set: function(value) this._get_set = value
      },
      non_writable: {
        value: 'readOnly',
        writable: false,
        configurable: false
      }
    });
    test.assertEqual('test', object.test);
    object.test = 'override';
    test.assertEqual('override', object.test);

    test.assertEqual('getter', object.getter, 'should call getter');
    try { object.getter = 'override'; } catch(e) { threw = true }
    test.assertEqual(
      true,
      threw,
      'assignment to property with only getter should throw'
    )
    test.assertEqual('getter', object.getter, 'should call getter');

    test.assertEqual(undefined, object.get_set);
    object.get_set = 'override'
    test.assertEqual('override', object.get_set);

    test.assertEqual('readOnly', object.non_writable);
    test.assertRaises(
      function() object.non_writable = 'override',
      /read\-only/g,
      'should throw on assignment to a non writable properties'
    );

    test.assertEqual('inherit', object.inherit);
    test.assertEqual(proto, Object.getPrototypeOf(object));
  }
}

if (!isNative(Function.prototype.bind)) {
  exports['test:bind this'] = function(test) {
    let object = { test: function foo() this };
    object.test.prototype = { constructor: object.test, test: 'uoau'};
    let func = object.test.bind(object);
    test.assertEqual(
      object,
      func(),
      'checking if function `this` in `func` is bounded object'
    );
    test.assertEqual(
      object.test.prototype,
      (new func()).__proto__,
      'checking if instance created from bounded function inherits from'
        + 'the original functions prototype'
    );
    test.assertEqual(
      object,
      func.boundTo,
      'value of boundTo must be object that was passed to bind'
    );
    test.assertEqual(
      object.test,
      func.bound,
      'value of bound property must be original function that was binded'
    );
    test.assertEqual(
      object,
      func.boundArgs[0],
      'boundArgs property must be an array of arguments passed to bind'
    );
  }
  exports['test:bind arguments'] = function(test) {
    let object = {};
    function sum(a, b, c, d) this.value = a + b + c + d;
    let func = sum.bind(object, 1, 2);
    func(3, 4);
    test.assertEqual(
      10,
      object.value,
      'must be 10 cause a was mapped to 1 and b to 2'
    );
  }

  exports['test:cross module test'] = function(test) {
    let module = require('./fixtures/es5');
    test.assertEqual(true, Object.isFrozen(module.frozen), 'should be frozen');
    test.assertEqual(true, Object.isSealed(module.sealed), 'should be sealed');
    test.assertEqual(
      false,
      Object.isExtensible(module.inextensible),
      'should be inextensible'
    );
  }
}

if (!isNative(Object.create)) {
  exports['test:non-enumerable properties'] = function(test) {
    let fixture1 = Object.create({}, {
      _hide: {
        value: 'secret',
        writable: false,
        enumerable: false
      }
    });
    let fixture2 = Object.create(fixture1, {
      visible: {
        value: 'buzz',
        enumerable: true
      }
    });
    test.assertEqual(
      0,
      keys(fixture1).length,
      'must not contain non enumerable properties'
    );
    test.assertEqual(
      1,
      keys(fixture2).length,
      'must not contain non enumerable inherited properties'
    );
  };

  exports['test:exception in the loop should not break objects iterator'] =
  function(test) {
    let fixture = Object.create({ a: 1, get b() { throw 'boom' } }, {
      _c: { value: 3 }
    });
    try {
      for (let key in fixture)
        fixture[key];
    }
    catch(e) {}
    test.assertEqual(
      2,
      keys(fixture).length,
      'should have two enumerable properties'
    )
  };

  exports['test:iteration over keys / values'] = function(test) {
    let keys = [];
    let values = [];
    let fixture = Object.create({ a: 1, b: 2, c: 3 }, { _d: { value: 4 }});

    for (let key in fixture) keys.push(key);
    test.assertEqual(
      true,
      containsSameElements(['a', 'b', 'c'], keys),
      'for iteration should return enumerable property keys'
    );

    for each(let value in fixture) values.push(value);
    test.assertEqual(
      true,
      containsSameElements([1, 2, 3], values),
      'for each iteration should return enumerable property values'
    )
  };

  exports['test:for each with Iterator function'] = function(test) {
    let fixture = Object.create({}, {
      a: { value: 1, enumerable: true },
      b: { value: 2 },
      c: { value: 3, enumerable: true }
    });
    let keys = [],
        values = [];
    for each (let [key, value] in Iterator(fixture)) {
      keys.push(key);
      values.push(value);
    }

    test.assertEqual(2, keys.length);
    test.assertEqual(2, values.length);
    test.assertEqual('a', keys[0]);
    test.assertEqual(1, values[0]);
    test.assertEqual('c', keys[1]);
    test.assertEqual(3, values[1]);
  }

  exports['test:custom enumerator'] = function(test) {
    let fixture = Object.create({ inherited: false }, {
      toString: { value: Object.prototype.toString },
      __iterator__: { value: function() { yield  'foo'; } },
      enumerableOne: { value: 'test', enumerable: true }
    });

    test.assert(
      containsSameElements(
        ['toString', '__iterator__', 'enumerableOne'],
        Object.getOwnPropertyNames(fixture)
      ),
      'must contain all the non-enumerables'
    );
  };

  exports['test:create must override inherited properties'] =
  function(test) {
    let fixture = Object.create({ get test() 'boom' }, {
      'test': { value: 'yei' }
    });
    test.assertEqual(
      'yei',
      fixture.test,
      'getter must be overridden'
    );
    test.assert(
      'value' in Object.getOwnPropertyDescriptor(fixture, 'test'),
      'must be a value not a getter'
    );
  };
}

if (!isNative(Object.getPrototypeOf)) {
  exports['test:defineProperty must override configurable properties'] =
  function(test) {
    let fixture = { get test() 'boom' };
    Object.defineProperty(fixture, 'test', { value: 'yei' });
    test.assertEqual(
      'yei',
      fixture.test,
      'getter must be overridden'
    );
    test.assert(
      'value' in Object.getOwnPropertyDescriptor(fixture, 'test'),
      'must be a value not a getter'
    );
  };

  exports['test:defineProperty on function'] = function(test) {
    function object() {};
    Object.defineProperty(object, 'get', {
        get: function() 'getter'
    });
    test.assertEqual('getter', object.get, 'must be getter from descriptor');
  };
}

if (!isNative(Object.freeze)) {
  exports['test: frozen objects with non-enumerable property in stirct mode'] =
  function(test) {
    let fixture = Object.freeze(Object.create({}, { test: { value: 'boom!' } }));
    try {
      for each (let key in fixture)
        key;
      test.pass('frozen object must be enumerable in "strict mode"');
    } catch(e) {
      test.fail('frozen objects should not throw when they are enumerated');
    }
  }
}

if (!Object.keys(exports).length) {
  exports['test:no need to test natives'] = function(test) {
    test.pass('No need to test native implementation')
  }
}
