<!-- contributed by Irakli Gozalishvil [gozala@mozilla.com]  -->

The `traits` module provides base building blocks for secure object
composition. 

Traits
------

[Traits] are a simple composition mechanism for structuring object-oriented
programs. Traits are similar to [interfaces], except that they often define
only a part of an object's data and behavior and are intended to be used in
conjunction with other traits to completely define the object.  
Traits are also considered to be a more robust alternative to [mixins]
because, name conflicts have to be resolved explicitly by composer & because
trait composition is order-independent (hence more declarative).


There are some other implementations of traits in javascript & some ideas / 
APIs are borrowed from them:

- [traitsjs]
- [joose]

Object-capability security model
--------------------------------

Implementation uses an [object-capability security model] to allow protection
of private APIs. At the same private APIs can be shared between among trait
composition parties. To put it simply: All the properties whose names start
with `"_"` are considered to be **private**, and are unaccessible from anywhere
except other **public** methods / accessors of the instance that had been
defined during composition.


[object-capability security model]:http://en.wikipedia.org/wiki/Object-capability_model
[traitsjs]:http://www.traitsjs.org/
[joose]:http://code.google.com/p/joose-js/
[Traits]:http://en.wikipedia.org/wiki/Trait_%28computer_science%29
[interfaces]:http://en.wikipedia.org/wiki/Interface_%28object-oriented_programming%29
[mixins]:http://en.wikipedia.org/wiki/Mixins

Introduction
------------

The module exports base trait / constructor function that constructs an 
instance of `Trait`.

Reference
---------

<api name="Trait">
@constructor
Creates an instance of Trait and returns it if it has no `constructor` method
defined. If instance has `constructor` method, then it is called with all the
arguments passed to this function and returned value is returned instead,
unless it's `undefined`. In that case instance is returned.
</api>

Trait
-----

`Trait` function represent a base trait. As with any other trait it represents
a constructor function for creating instances of it's own & a placeholder
for a trait compositions functions.

<api name="compose">
@method
Composes new trait out of itself and traits / property maps passed as an
arguments. If two or more traits / property maps have properties with the same
name, the new trait will contain a "conflict" property for that name (see
examples in Examples section to find out more about "conflict" properties).
This is a commutative and associative operation, and the order of its
arguments is not significant.

@param trait1 {Object|Function}
    Trait or property map to compose new trait from.
@param trait2 {Object|Function}
    Trait or property map to compose new trait from.
@param ... {Object|Function}
    Traits or property maps to compose new trait from.

@returns {Function}
    New trait containing the combined properties of all the traits.
</api>

*Examples:*

Let's say we want to define a reusable piece of code for a lists of elements.
    
    const { Trait } = require('traits');
    const List = Trait.compose({
      // private API:
      _list: null,
      // public API
      constructor: function List() this._list = [],
      get length() this._list.length,
      add: function add(item) this._list.push(item),
      remove: function remove(item) {
        let list = this._list;
        let index = list.indexOf(item);
        if (0 <= index) list.slice(index, 1);
      }
    });

Instances of `List` can be created by calling `List` function with or without
`new` keyword.

    let l1 = List();
    l1 instanceof List;      // true
    let l2 = new List();
    l2 instanceof List;      // true

As you can see `add` and `remove` functions are capable of accessing private
`_list` property, but thats about it, there's nothing else that will be able
to access this property:
  
    '_list' in l1;              // false
    '_list' in l2;              // false
    '_list' in List.protoype;   // false
    l1.has = function(name) name in this
    l1.has('_list');            // false
    l1.length;                  // 0
    l1.add('test')
    l1.length                   // 1


<api name="required">
@property {Object}
Singleton, used during trait composition to define "required" properties.
</api>

**Example:**

    const Enumerable = Trait.compose({
      list: Trait.required,
      forEach: function forEach(consumer) {
        return this.list.forEach(consumer);
      }
    });

    let c1 = Enumerable();      // Error: Missing required property: list

    const EnumerableList = List.compose({
      get list: this._list.slice(0)
    }, Enumerable);

    let c2 = EnumerableList();
    c2.add('test')
    c2.length                   // 1
    c2.list[0]                  // 'test'
    c2.forEach(console.log)     // > info: 'test'


<api name="resolve">
@method
Composes a new trait that has all the same properties
as the trait on which it is called, except that each property listed
in the `resolutions` argument will be renamed from the name
of the  property in the `resolutions` argument to its value.
And if its value is `null`, the property will become required.
@param resolutions {Object}
@returns {Function}
    New resolved trait.
</api>

**Example:**

    const Range = List.resolve({
      constructor: null,
      add: '_add',
    }).compose({
      min: null,
      max: null,
      get list() this._list.slice(0),
      constructor: function Range(min, max) {
        this.min = min;
        this.max = max;
        this._list = [];
      },
      add: function(item) {
        if (item <= this.max && item >= this.min)
          this._add(item)
      }
    });
    
    
    let r = Range(0, 10);
    r.min;                      // 0
    r.max;                      // 10
    r.length;                   // 0;
    r.add(5);
    r.length;                   // 1
    r.add(12);
    r.length;                   // 1 (12 was not in a range)


<api name="override">
@method
Composes a new trait with all of the combined properties of `this` and the
argument traits. In contrast to `compose`, `override` immediately resolves
all conflicts resulting from this composition by overriding the properties of
later traits. Trait priority is from left to right. I.e. the properties of
the leftmost trait are never overridden.
@param trait1 {Object|Function}
    Trait or property map to compose new trait from.
@param trait2 {Object|Function}
    Trait or property map to compose new trait from.
@param ... {Object|Function}
    Traits or property maps to compose new trait from.

@returns {Function}
    New trait containing the combined properties of all the traits.
</api>

**Example:**

    // will compose trait with conflict property 'constructor'
    var ConstructableList = List.compose({
      constructor: function List() this._list = Array.slice(arguments)
    });
    // throws error with message 'Remaining conflicting property: constructor'
    ConstructableList(1, 2, 3);

    var ConstructableList = List.overridden({
      constructor: function List() this._list = Array.slice(arguments)
    });
    ConstructableList(1, 2, 3).length       // 3

Trait Objects
-------------

Since all the traits are composed out of base `Trait` their instances will
contain properties described below, unless explicitly overriding them in
composition.

<api name="_public">
@property {Object}
Internal property of instance representing public API that is exposed to the
consumers of an instance.
</api>

<api name='toString'>
@method
Textual representation of an object. All the traits will return:
`'[object Trait]'` string, unless they have `constructor` property, in that
case string `'Trait'` is replaced with the name of `constructor` property.
</api>

**Example:**

    const MyTrait = Trait.compose({
      constructor: function MyTrait() {
        // do your initialization here
      }
    });
    MyTrait().toString();     // [object MyTrait]

