The `es5` module provides shim layer to a versions of firefox not yet
implementing EcmaScript 5 features.

- New API's are described in the official [ES5 specification].
- John Resig made post with good [introduction] of new API's.
- Google tech talk [changes to JavaScript] is also a good walk through.

**There is no need to `require` this module** since it's automatically gets
preloaded into all jetpack sandboxes.

Usage of new ES5 API's is encouraged, but since not everything can be
provided to all the versions of firefox, there are few things to be aware of:

- `Object.freeze`, `Object.seal`, `Object.preventExtensions` does not really
prevents any mutations. One thing it guarantees though, `Object.isFrozen`,
`Object.isSealed`, `Object.isExtensible` checks will behave as defined in
specification.

- `Object.defineProperty` is only partially compliant with specification:
	- Non configurable properties will be created as configurable ones.
	- Instead of non-writable properties getters and setters will be defined,
		but `Object.getOwnPropertyDescriptor` will still behave as expected
		(will return property descriptor for non-writable property not a getter)
	- Defining properties using ES5 functions will break your [custom iterators]
		 if you have any. Think twice before employing custom iterator cause in
		 majority of cases you can just make properties non enumerable. In case
		 you really need to have custom iterator be smart about it, make sure to
		 add it after running ES5 functions and don't ignore previous iterators.
		 Please see example below for inspiration:

		     let object = Object.create({}, {
		       myField: { value: 6 }
		     });
		     object.__iterator__ = (function(original) {
		       return function myIterator() {
		         this.__iterator__ = original;
		         for (let key in this) {
		           // your logic here
		         }
		         this.__iterator__ = myIterator;
		       }
		     })(object.__iterator__);

[custom iterators]:https://developer.mozilla.org/en/New_in_JavaScript_1.7#Iterators
[ES5 specification]:http://www.ecmascript.org/docs/tc39-2009-043.pdf
[introduction]:http://ejohn.org/blog/ecmascript-5-objects-and-properties/
[changes to JavaScript]:http://www.youtube.com/watch?v=Kq4FpMe6cRs