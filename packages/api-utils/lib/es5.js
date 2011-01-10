/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Jetpack.
 *
 * The Initial Developer of the Original Code is Mozilla
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Irakli Gozalishvili <gozala@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

// Override the default Iterator function with one that passes
// a second argument to custom iterator methods that identifies
// the call as originating from an Iterator function so the custom
// iterator method can return [key, value] pairs just like default
// iterators called via the default Iterator function.

Iterator = (function(DefaultIterator) {
  return function Iterator(obj, keysOnly) {
    if ("__iterator__" in obj && !keysOnly)
      return obj.__iterator__.call(obj, false, true);
    return DefaultIterator(obj, keysOnly);
  };
})(Iterator);

(function(exports) {
const // local shortcuts
  hasOwn = Object.prototype.hasOwnProperty,
  getGetter = Object.prototype.__lookupGetter__,
  getSetter = Object.prototype.__lookupSetter__,
  setGetter = Object.prototype.__defineGetter__,
  setSetter = Object.prototype.__defineSetter__,
  ObjectToString = Object.prototype.toString;
const
  ID = '__es5_guid__',
  PROTO = {};
let // registry
  GUID = 0,
  REGISTRY = {
    inextensible: {},
    frozen: {},
    sealed: {}
  },
  DESCRIPTORS = {};

/**
 * function gets `guid` for an object if it's in a registry. If
 * object is not in a registry and `force` argument is `true` object
 * gets unique identifier, special iterator hiding it & entry in registry.
 * as a result of a call `guid` is returned if not in registry and `force` is
 * not `true` `null` is returned.
 * @param {Object} object
 *    object to get a `guid` for.
 * @param {Boolean} force
 *    if `true` and object is not in registry it will be added there.
 */
function _guid(object, force) {
  let guid = object[ID];
  if (!guid && force) {
    guid = object[ID] = ++ GUID;
    if (!('__iterator__' in object))
      defineIterator(object);
  }
  return guid || null
}
function noSetter() {
  throw new TypeError('setting a property that has only a getter');
}
function nonWritable() {
  throw new TypeError('setting a property that is read-only');
}

/**
 * Function that generates ES5 object mutation functions(freeze, seal
 * preventExtensions). Since in ES3 we can't implement ES5 `object` mutations
 * we have a local registry for tracking mutated objects.
 * @param {String} name
 *    property in mutation phase registry that is set to `true` when called
 */
function Mutate(name) {
  let registry = REGISTRY[name];
  return function(object) {
    registry[_guid(object, true)] = true;
    return object;
  }
}

/**
 * Function that generates ES5 mutation phase checker functions. Since in
 * ES3 we can't implement ES5 `object` mutations we have a local registry
 * for tracking mutated objects in order to evaluate next statement to `true`
 * `Object.isFrozen(Object.freeze({}))`
 * @param {String} name
 *    property in mutation phase registry that represents mutation
 * @param {Boolean} invert
 *    Weather or not registry values should be inverted by generated function.
 *    Values are inverted by `Object.isExtensible` because default is `true`.
 */
function IsMutated(name, invert) {
  let registry = REGISTRY[name];
  return function(object)
    invert ? !registry[_guid(object)] : !!registry[_guid(object)];
}

/**
 * Defines custom `__iterator__` that wraps original `__iterator__` & uses
 * locar object despriptor registry to iterate only on enumerable properties.
 * '__iterator__' getter is used as a proxy to an iterator, what allows
 * it to determine whether or not `Iterator` wrapper is used.
 * @see https://developer.mozilla.org/en/New_in_JavaScript_1.7#Iterators
 */
function defineIterator(object) {
  let onKeyValue = false,
      ITERATOR = { __iterator__: undefined };
  function iterator(onKeys) {
    ITERATOR.__proto__ = this;
    for (let key in ITERATOR) {
      if (key === ID || '__iterator__' === key)
        continue;
      let descriptor = getPropertyDescriptor(this, key);
      if (descriptor && false === descriptor.enumerable)
        continue;
      yield onKeyValue ? [key, this[key]] : onKeys ? key : this[key];
    }
  }
  setGetter.call(object, '__iterator__', function __es5iterator__() {
    let stack = Error().stack.split(/\n/);
    onKeyValue = (
      stack[2].indexOf('Iterator(') == 0 || // native implementation of bind
      stack[3].indexOf('Iterator(') == 0    // custom implementation of bind
    );
    return iterator;
  });
  setSetter.call(object, '__iterator__', function(value) iterator = value);
}

/**
 * Almost identical to the ES5 `Object.getOwnPropertyDescriptor` function.
 * Only difference is that this function will return descriptors for
 * inherited properties along with own. This helper function is used by custom
 * iterators. They need to check each property (including inherited ones)
 * whether or not it's enumerable.
 * @see #__iterator__
 * @see #iterator
 */
function getPropertyDescriptor(object, name) {
  let descriptor = getOwnPropertyDescriptor(object, name);
  if (!descriptor) {
    let proto = object.__proto__;
    if (proto)
      descriptor = getPropertyDescriptor(proto, name);
  }
  if (descriptor && ('value' in descriptor))
    descriptor.value = object[name];
  return descriptor;
}

/** ES5 15.4.3.2 */
function isArray(object) ObjectToString.call(object) == '[object Array]';

/** ES5 15.2.3.2 */
function getPrototypeOf(object) object.__proto__;

/**
 * ES5 15.2.3.8
 * Can't implement this feature in ES3. Function just pretends to be
 * doing whatever specs say, instead it registers state so that check
 * calling `Object.isSealed` on sealed object will return `true`
 */
let seal = Mutate('sealed');

/**
 * ES5 15.2.3.9
 * Can't implement this feature in ES3. Function just pretends to be
 * doing whatever specs say, instead it registers state so that checking
 * calling `Object.isFrozen` on frozen object will return `true`.
 */
let freeze = Mutate('frozen');

/**
 * ES5 15.2.3.10
 * Can't implement this feature in ES3. Function just pretends to be
 * doing whatever specs say, instead it registers state so that checking
 * calling `Object.isExtensible` on inextensible object will return `true`.
 */
let preventExtensions = Mutate('inextensible');

/**
 * ES5 15.2.3.11
 * Can't implement this feature in ES3. Function just pretends to be
 * doing whatever specs say, instead it looks into state registry, where
 * all the mutation functions store state.
 */
let isSealed = IsMutated('sealed');

/**
 * ES5 15.2.3.12
 * Can't implement this feature in ES3. Function just pretends to be
 * doing whatever specs say, instead it looks into state registry, where
 * all the mutation functions store state.
 */
let isFrozen = IsMutated('frozen');

/**
 * ES5 15.2.3.13
 * Can't implement this feature in ES3. Function just pretends to be
 * doing whatever specs say, instead it looks into state registry, where
 * all the mutation functions store state.
 */
let isExtensible = exports.isExtensible = IsMutated('inextensible', true);

/** ES5 15.2.3.14 */
function keys(object) {
  let result = [];
  for (let name in object) {
    if (hasOwn.call(object, name))
      result.push(name);
  }
  return result;
}

/** ES5 15.2.3.4 */
function getOwnPropertyNames(object) {
  let ITERATOR = { __proto__: object, __iterator__: undefined };
  let result = [];
  for (let name in ITERATOR) {
    if (hasOwn.call(object, name) && ID !== name) {
      let skip = false;
      if ('__iterator__' === name) {
        let iteratror = getGetter.call(object, '__iterator__');
        skip = iteratror && '__es5iterator__' === iteratror.name;
      }
      if (!skip)
        result.push(name);
    }
  }
  return result;
}

/** ES5 15.2.3.3 */
function getOwnPropertyDescriptor(object, name) {
  if (!hasOwn.call(object, name))
    return undefined;
  let descriptor = {
    configurable: true,
    enumerable: true
  };
  // lets override descriptor with values from registry if are any
  let _descriptor, objectDescriptor = DESCRIPTORS[_guid(object)];
  if (objectDescriptor && (_descriptor = objectDescriptor[name])) {
    descriptor.enumerable = _descriptor.enumerable;
    descriptor.configurable = _descriptor.configurable;
    if ('writable' in _descriptor)
      descriptor.writable = _descriptor.writable;
  }
  if (false === descriptor.writable) {
    // special case where want to pretend that we have value not a getter
    descriptor.value = object[name]
  }
  else {
    let get = getGetter.call(object, name),
        set = getSetter.call(object, name);
    if (!get && !set) {
      descriptor.value = object[name];
      descriptor.writable = true;
    }
    else {
      descriptor.get = get;
      descriptor.set = set;
    }
  }
  return descriptor;
}

/**
 * ES5 15.2.3.6
 * Partially implements ES5 `Object.defineProperty`.
 * - Non configurable properties can't be implement in ES3, so all the non
 * configurable properties will be created as configurable ones.
 * - Non writable properties can't be implemented in ES3, getters and setters
 * will be created instead, but `Object.getOwnPropertyDescriptor` will still
 * behave as expected (will return descriptor for non writable property not a
 * getter)
 * - Defining properties using ES5 functions will break your custom iterators
 * if you have any. Think twice before employing custom iterator cause in
 * majority of cases you can just make properties non enumerable. In case you
 * really need to have custom iterator be smart about it, make sure to add
 * it after running ES5 functions and don't ignore previous iterators. Please
 * see example below for inspiration:
 *    let object = Object.create({}, {
 *      myField: { value: 6 }
 *    });
 *    object.__iterator__ = (function(original) {
 *      return function myIterator() {
 *        this.__iterator__ = original;
 *        for (let key in this) {
 *          // your logic here
 *        }
 *        this.__iterator__ = myIterator;
 *      }
 *    })(object.__iterator__);
 */
function defineProperty(object, name, descriptor) {
  if ('object' !== typeof object && 'function' !== typeof object)
    throw new TypeError('Object prototype may only be an Object or null.');
  if (descriptor && 'object' !== typeof descriptor)
    throw new TypeError('Property descriptor list must be an Object.');

  if ('value' in descriptor) { // if it's property
    if ('get' in descriptor || 'set' in descriptor) {
      throw new TypeError('Invalid property. "value" present on property'
        + 'with getter or setter.');
    }
    if (false === descriptor.writable) {
      let value = descriptor.value;
      setGetter.call(object, name, function() value);
      setSetter.call(object, name, nonWritable);
    }
    else {
      // temporary removing proto to avoid inherited getter / setter
      let proto = object.__proto__;
      object.__proto__ = PROTO;
      delete object[name];
      object[name] = descriptor.value;
      object.__proto__ = proto;
    }
  }
  else { // if it's a setter / getter
    if ('writable' in descriptor)
      throw new TypeError('Invalid property. "writable" present on property'
        + 'with getter or setter.');
    let get = descriptor.get, hasGet = (typeof get == "function"),
        set = descriptor.set, hasSet = (typeof set == "function");
    if (hasGet)
      setGetter.call(object, name, get);
    if (hasSet)
      setSetter.call(object, name, descriptor.set);
    // should throw if only getter is assigned
    else if (hasGet)
      setSetter.call(object, name, noSetter);
  }
  // registering descriptor
  let guid = _guid(object, true);
  let ObjectRegistry = DESCRIPTORS[guid] || (DESCRIPTORS[guid] = {});
  let registry = ObjectRegistry[name] || (ObjectRegistry[name] = {});
  if ('writable' in descriptor)
    registry.writable = !!descriptor.writable;
  let enumerable = registry.enumerable =
    'enumerable' in descriptor ? !!descriptor.enumerable : false;
  registry.configurable =
    'configurable' in descriptor ? !!descriptor.configurable : false;
  return object;
}

/**
 * ES5 15.2.3.7
 * Some functionality can't be implemented using ES5.
 * @see #defineProperty
 */
function defineProperties(object, descriptor) {
  let names = getOwnPropertyNames(descriptor);
  for each (let name in names)
    defineProperty(object, name, descriptor[name]);
  return object;
}

/**
 * ES5 15.2.3.5
 * Some functionality can't be implemented using ES5.
 * @see #defineProperty
 */
function create(proto, descriptor) {
  if (typeof proto != 'object')
    throw new TypeError(
      'typeof prototype[' + (typeof proto) + '] != "object"'
    );
  let inheritsIterator = (
    (!descriptor || !('__iterator__' in descriptor))
    && proto && '__iterator__' in proto
  );
  let object = {};
  if (inheritsIterator)
    object.__iterator__ = undefined;
  if (typeof descriptor !== "undefined")
    defineProperties(object, descriptor);
  if (inheritsIterator)
    delete object.__iterator__;
  object.__proto__ = proto;
  return object;
}

/** ES-5 15.3.4.5 */
function bind(that) {
  /** 1. Let Target be the this value.  **/
  let target = this;
  /**
      2. If IsCallable(Target) is false, throw a TypeError exception.
      XXX this gets pretty close, for all intents and purposes, letting
      some duck-types slide
  */
  if (typeof target.apply != "function" || typeof target.call != "function")
    return new TypeError();
  /**
    3.  Let A be a new (possibly empty) internal list of all of the
        argument values provided after thisArg (arg1, arg2 etc), in order.
  */
  let boundArgs = Array.slice(arguments);
  /**
    4.  Let F be a new native ECMAScript object.
    9.  Set the [[Prototype]] internal property of F to the standard
        built-in Function prototype object as specified in 15.3.3.1.
    10. Set the [[Call]] internal property of F as described in
    15.3.4.5.1.
    11. Set the [[Construct]] internal property of F as described in
    15.3.4.5.2.
    12. Set the [[HasInstance]] internal property of F as described in
    15.3.4.5.3.
    13. The [[Scope]] internal property of F is unused and need not
        exist.
  */
  function bound() {
    let params = boundArgs.concat(Array.slice(arguments))
    if (this instanceof bound) {
      /**
        15.3.4.5.2 [[Construct]]
        When the [[Construct]] internal method of a function object,
        F that was created using the bind function is called with a
        list of arguments ExtraArgs the following steps are taken:
        1.  Let target be the value of F's [[TargetFunction]]
            internal property.
        2.  If target has no [[Construct]] internal method, a
            TypeError exception is thrown.
        3.  Let boundArgs be the value of F's [[BoundArgs]] internal
            property.
        4.  Let args be a new list containing the same values as the
            list boundArgs in the same order followed by the same
            values as the list ExtraArgs in the same order.
      */
      let self = create(target.prototype);
      target.apply(self, params);
      return self;
    }
    else {
      /**
        15.3.4.5.1 [[Call]]
        When the [[Call]] internal method of a function object, F,
        which was created using the bind function is called with a
        this value and a list of arguments ExtraArgs the following
        steps are taken:
        1.  Let boundArgs be the value of F's [[BoundArgs]] internal
            property.
        2.  Let boundThis be the value of F's [[BoundThis]] internal
            property.
        3.  Let target be the value of F's [[TargetFunction]] internal
            property.
        4.  Let args be a new list containing the same values as the
            list boundArgs in the same order followed by the same
            values as the list ExtraArgs in the same order. 5. Return
            the result of calling the [[Call]] internal method of
            target providing boundThis as the this value and providing
            args as the arguments.
        equiv: target.call(this, ...boundArgs, ...args)
      */
      return target.call.apply(target, params);
    }
  }
  /**
    5. Set the [[TargetFunction]] internal property of F to Target.
    extra:
  */
  bound.bound = target;
  /**
    6. Set the [[BoundThis]] internal property of F to the value of
    thisArg.
    extra:
  */
  bound.boundTo = that;
  /**
    7. Set the [[BoundArgs]] internal property of F to A.
    extra:
  */
  bound.boundArgs = boundArgs;
  /**
    14. If the [[Class]] internal property of Target is "Function", then
    a.  Let L be the length property of Target minus the length of A.
    b.  Set the length own property of F to either 0 or L, whichever is
        larger.
    15. Else set the length own property of F to 0.
  */
  // #Note can't modify length in es3.
  /**
    16. The length own property of F is given attributes as specified in
    15.3.5.1.
    #TODO
    17. Set the [[Extensible]] internal property of F to true.
    #TODO
    18. Call the [[DefineOwnProperty]] internal method of F with
        arguments "caller", PropertyDescriptor {[[Value]]: null,
        [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]:
        false}, and false.
    #TODO
    19. Call the [[DefineOwnProperty]] internal method of F with
        arguments "arguments", PropertyDescriptor {[[Value]]: null,
        [[Writable]]: false, [[Enumerable]]: false, [[Configurable]]:
        false}, and false.
    NOTE Function objects created using Function.prototype.bind do not
    have a prototype property.
  */
  // #Note can't delete prototype in es3.
  return bound;
}

/**
 * Implements missing ES5 features in passed `Object`, `Array`, `Function`.
 * @param {Object}
 *    `Object` to be extended with a missing ES5 features.
 * @param {Array}
 *    `Array` to be extended with a missing ES5 features.
 * @param {Function}
 *    `Function` to be extended with a missing ES5 features.
 * @see http://www.ecmascript.org/docs/tc39-2009-043.pdf
 */
exports.init = function init(Object, Array, Function) {
  if (Array) {
    if (!Array.isArray)
      Array.isArray = isArray;
  }
  if (Object) {
    if (!Object.seal)
      Object.seal = seal;
    if (!Object.freeze)
      Object.freeze = freeze;
    if (!Object.preventExtensions)
      Object.preventExtensions = preventExtensions;
    if (!Object.isSealed)
      Object.isSealed = isSealed;
    if (!Object.isFrozen)
      Object.isFrozen = isFrozen;
    if (!Object.isExtensible)
      Object.isExtensible = isExtensible;
    if (!Object.keys)
      Object.keys = keys;
    if (!Object.getPrototypeOf)
      Object.getPrototypeOf = getPrototypeOf;
    if (!Object.getOwnPropertyNames)
      Object.getOwnPropertyNames = getOwnPropertyNames;
    if (!Object.getOwnPropertyDescriptor)
      Object.getOwnPropertyDescriptor = getOwnPropertyDescriptor;
    if (!Object.defineProperty)
      Object.defineProperty = defineProperty;
    if (!Object.defineProperties)
      Object.defineProperties = defineProperties;
    if (!Object.create)
      Object.create = create;
  }
  if (Function) {
    if (!Function.prototype.bind)
      Function.prototype.bind = bind;
  }
};
exports.init(Object, Array, Function);
})(this.exports ? exports : {});
