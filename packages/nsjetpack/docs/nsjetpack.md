`nsJetpack` is a binary component used to provide services
that aren't otherwise available to scripted chrome code in the Mozilla
platform.

## Accessing the Component ##

Simply call `require("nsjetpack").get()`. Note that an exception may be
thrown if the component isn't available for the host operating system
and application binary interface.

## Sample Code ##

Sample code for `nsJetpack` can be found in its [test suite].

  [test suite]: packages/nsjetpack/tests/test-legacy-nsjetpack.js

## Flexible Membrane Functionality ##

`nsJetpack` contains functionality that exposes many
SpiderMonkey C API calls to JavaScript, allowing chrome code to create
custom membranes (aka wrappers) that allow trusted and untrusted code
to interoperate.

Aside from security, however, this functionality can also be used to
implement APIs that can't normally be implemented using the JavaScript
language, such as the `window.localStorage` interface in
HTML5.

The source code for this functionality is in [wrapper.cpp].

  [wrapper.cpp]: packages/nsjetpack/components/src/wrapper.cpp

### Security Concerns ###

Note that the Flexible Membrane functionality is intended primarily
for prototyping purposes; its use is discouraged in production code
for two reasons:

* The membrane methods have a tendency to get called very frequently,
  and as a result, implementing them in JavaScript is likely to not be
  efficient.

* JavaScript is an inherently dynamic language, and it's very hard to
  predict what all the possible outcomes of JavaScript code for a
  membrane might be&mdash;especially when the membrane's script is in
  the same `JSRuntime` as the code it's trying to protect.
  Because of this, it's hard to code review a Flexible Membrane for
  security vulnerabilities.

* Because of these concerns, it's advised that any flexible membranes
  be re-written in C++ before being reviewed for security and placed
  in production code.  Before being re-written, however, a test suite
  should be created for the membrane to ensure that its new
  implementation has the same characteristics as the original.

### Functions ###

<code>nsJetpack.**wrap**(*wrappee*, *membrane*)</code>

This function wraps *wrappee* with the *membrane* (meaning that
*membrane* mediates all access to and from *wrappee*).  The wrapped
object is returned.

<code>nsJetpack.**unwrap**(*wrappedObject*)</code>

Removes the membrane from *wrappedObject* and returns the wrappee. If
*wrappedObject* wasn't ever wrapped by *nsJetpack.*`wrap()`,
this function returns `null`.

<code>nsJetpack.**getWrapper**(*wrappedObject*)</code>

Returns the membrane for the given *wrappedObject*. If *wrappedObject*
wasn't ever wrapped by *nsJetpack.*`wrap()`, this function
returns `null`.

### Membrane Objects ###

A *membrane object* is a user-defined JavaScript object with any of
the following optional methods defined.

Note that for all of these methods, `this` is set to the
instance of the membrane whose method is being called.

<code>membrane.**call**(*wrappee*, *wrappedObject*, *thisObj*, *args*)</code>

This is essentially a JavaScript version of <code>[JSClass.call]</code>;
alternatively, it could be described as the analog of Python's
`__call__` magic method.  *thisObj* is the object that the
callee's `this` variable should be set to, and *args* is the
array of arguments to be passed to the callee.  This method should
return whatever the return value of the callee is, or raise an
exception.

  [JSClass.call]: https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JSClass.call

<code>membrane.**construct**(*wrappee*, *wrappedObject*, *thisObj*, *args*)</code>

This is essentially a JavaScript version of
<code>[JSClass.construct]</code>.  It's just like
*membrane.*`call()`, only it's called when the call is preceded
by the `new` operator.

  [JSClass.construct]: https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JSClass.construct

`membrane.`**convert**(*wrappee*, *wrappedObject*, *type*)

This is essentially a JavaScript version of
<code>[JSClass.convert]</code>, and is called when SpiderMonkey needs to
coerce *wrappee* to a different type.  *type* is a string identifying
the name of the desired type to coerce to, and can be anything
ordinarily returned by JavaScript's *typeof* operator.  The default
implementation of this is to call *wrappee.*`valueOf()`.

**NOTE:** Be very careful about implementing this function, as it can
easily cause infinite recursion.

  [JSClass.convert]: https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JSClass.convert

<code>membrane.**resolve**(*wrappee*, *wrappedObject*, *name*)</code>

This is essentially a JavaScript version of
<code>[JSClass.resolve]</code>.  It's called when the property identified
by *name* doesn't exist on *wrappedObject*.  The membrane should
either define *name* on *wrappedObject* and return *wrappedObject*,
or&mdash;if *name* doesn't exist&mdash;it should return
`undefined`.

  [JSClass.resolve]: https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JSClass.resolve

<code>membrane.**enumerate**(*wrappee*, *wrappedObject*)</code>

This is essentially a JavaScript version of
<code>[JSClass.enumerate]</code>.  It should return an iterator that
iterates through all the property names in *wrappee*.

  [JSClass.enumerate]: https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JSClass.enumerate

<code>membrane.**iteratorObject**(*wrappee*, *wrappedObject*, *keysOnly*)</code>

This is essentially a JavaScript version of
<code>[JSExtendedClass.iteratorObject]</code>.  If *keysOnly* is
`true`, it should return an iterator that iterates through all
the property names in *wrappee*.  Otherwise, it should return an
iterator that yields key-value pairs (in an `Array` object).

  [JSExtendedClass.iteratorObject]: https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JSExtendedClass.iteratorObject

<code>membrane.**getProperty**(*wrappee*, *wrappedObject*, *name*, *defaultValue*)</code>

This is essentially a JavaScript version of
<code>[JSClass.getProperty]</code>; alternatively, it could be described
as the analog of Python's `__getattr__` magic method. *name* is
the name of the property being accessed, and *defaultValue* is the
value that JavaScript would ordinarily return.  This function should
return the value of the property, which may be *defaultValue* or
something different. Alternatively, the method may also throw an
exception.

  [JSClass.getProperty]: https://developer.mozilla.org/En/SpiderMonkey/JSAPI_Reference/JSPropertyOp

<code>membrane.**setProperty**(*wrappee*, *wrappedObject*, *name*, *defaultValue*)</code>

This is essentially a JavaScript version of
<code>[JSClass.setProperty]</code>; alternatively, it could be described
as the analog of Python's `__setattr__` magic method. *name* is
the name of the property being accessed, and *defaultValue* is the
value that JavaScript would ordinarily set the value of the property
to.  This function should return the value to set the property to,
which may be *defaultValue* or something different. Alternatively, the
method may also throw an exception.

  [JSClass.setProperty]: https://developer.mozilla.org/En/SpiderMonkey/JSAPI_Reference/JSPropertyOp

<code>membrane.**addProperty**(*wrappee*, *wrappedObject*, *name*, *defaultValue*)</code>

This is essentially a JavaScript version of
<code>[JSClass.addProperty]</code>, and is called immediately after a new
property has been added to *wrappedObject*. *name* is the name of the
property being accessed, and *defaultValue* is the value that
JavaScript would ordinarily set the initial value of the property to.
This function should return the initial value to set the property to,
which may be *defaultValue* or something different. Alternatively, the
method may also throw an exception.

  [JSClass.addProperty]: https://developer.mozilla.org/En/SpiderMonkey/JSAPI_Reference/JSPropertyOp

<code>membrane.**delProperty**(*wrappee*, *wrappedObject*, *name*)</code>

This is essentially a JavaScript version of
<code>[JSClass.delProperty]</code>; alternatively, it could be described
as the analog of Python's `__delattr__` magic method. *name* is
the name of the property being deleted.  This function should return
`true` if the property can be deleted, and `false` if
not.

  [JSClass.delProperty]: https://developer.mozilla.org/En/SpiderMonkey/JSAPI_Reference/JSPropertyOp

## Memory Profiling ##

`nsJetpack` contains functionality allowing chrome code to
examine the JavaScript heap. The semantics of this are described at a
high level in Atul's blog post entitled [Fun with SpiderMonkey];
please read this blog post before reading the rest of this section.

The source code for this functionality is in [memory_profiler.cpp].

  [Fun with SpiderMonkey]: http://www.toolness.com/wp/?p=604
  [memory_profiler.cpp]: packages/nsjetpack/components/src/memory_profiler.cpp

### Functions ###

<code>nsJetpack.**profileMemory**(*code*, *filename*, *lineNumber*, *namedObjects*, *argument*)</code>

This function launches a memory profiling JS runtime and executes
*code* in it. The *filename* and *lineNumber* information is for error
reporting purposes only.

*namedObjects* is an optional object whose properties, called "names",
point to objects in the target JS runtime; these objects can be
referred to by their names by certain functions in the memory
profiling JS runtime.

*argument* is an optional string that will be copied into the
profiling JS runtime as a global variable of the same name. This
allows the target JS runtime to pass execution parameters (serialized
as a JSON string, perhaps) into the profiling JS runtime.

If the final statement of *code* results in a string value, this value
is copied and passed back as the result of this function.  This allows
*code* to perform some memory profiling activity and return the
results back to the target JS runtime.

### Memory Profiling Globals ###

Code running in the memory profiling JS runtime has access to the
following global objects and functions.

<code>**ServerSocket**()</code>

This constructor creates a new blocking TCP/IP socket, aka
`ServerSocket`.

<code>**getGCRoots**()</code>

Returns an array of the numeric JavaScript object IDs of the target
runtime that are garbage collection roots.

<code>**getObjectTable**()</code>

Returns an object whose keys are object IDs and whose values are the
name of the `JSClass` used by the object for each ID.  This is
effectively an index into all objects in the target runtime.

<code>**getObjectInfo**(*idOrName*)</code>

Returns a JSON-able object containing metadata for the object in the target runtime with the given numeric ID or string name. The object may contain any of the following keys:

`id` - The numeric ID of the object.

`nativeClass` - The name of the `JSClass` used by the object.

`size` - The size of the object, as reported by
`JS_GetObjectTotalSize()`.

`parent` - The object's `__parent__` property (i.e., its global scope).

`prototype` - The object's `__proto__` property.

`wrappedObject` - The object ID of the object that this object wraps.

`outerObject` - The object ID for this object's outer half, if
it's the inner half of a [split object].

`innerObject` - The object ID for this object's inner half, if
it's the outer half of a [split object].

  [split object]: https://developer.mozilla.org/En/SpiderMonkey/Split_object

`children` - An array of object IDs corresponding to all the
objects that this object references.  Note that these aren't really
"children" in a hierarchical sense, but rather in a heap-tracing
sense.

`functionSize` - If this object corresponds to a function, this
is the value returned by `JS_GetFunctionTotalSize()` on the
object.

`scriptSize` - If this object corresponds to a function, this
is the value returned by `JS_GetScriptTotalSize()` on the
object.

`name` - If this object corresponds to a function, this is the
function's name.

`filename` - If this object corresponds to a function, this is
the filename in which the function is defined.

`lineStart` - If this object corresponds to a function, this is
the line at which the function's code begins.

`lineEnd` - If this object corresponds to a function, this is
the line at which the function's code ends.

<code>**getObjectParent**(*idOrName*)</code>

Returns the object ID of the object with the given numeric ID or
string name. If the object has no parent, `null` is returned.

<code>**getObjectProperties**(*idOrName*, *useAlternateAlgorithm*)</code>

Returns a list of the properties on the given object, which doesn't
include properties of the object's prototype.  If
*useAlternateAlgorithm* is true, a different JSAPI call will be used
to obtain the properties.  This function has a tendency to
inadvertently execute code on the target runtime, so be very careful
what objects you call this on.

<code>**getNamedObjects**()</code>

Returns a JSON-able object containing a mapping of names to numeric
object IDs; this is the "mirror" of the *namedObjects* parameter
passed to *nsJetpack.*`profileMemory()` in the memory profiling
runtime.

<code>**stack**()</code>

Returns a `StackFrame` object corresponding to the current
state of the memory profiling runtime's stack.

<code>**lastException**</code>

This global variable contains a reference to the most recently-thrown
exception in the memory profiling runtime.

<code>**lastExceptionTraceback**</code>

This global variable contains a reference to the `StackFrame`
of the most recently-thrown exception in the memory profiling runtime.

**argument**

This global variable is a copy of the *argument* parameter passed to
*nsJetpack.*`profileMemory()` in the memory profiling runtime.

### StackFrame Objects ###

<code>StackFrame.**filename**</code>

The filename of the stack frame.

<code>StackFrame.**lineNo**</code>

The line number of the stack frame.

<code>StackFrame.**functionName**</code>

The function in which the stack frame is taking place.

<code>StackFrame.**functionObject**</code>

A reference to the function object in which the stack frame is taking
place.

<code>StackFrame.**scopeChain**</code>

A reference to the scope chain of the stack frame.

<code>StackFrame.**caller**</code>

A reference to the `StackFrame` of this stack frame's
caller. If this stack frame doesn't have a caller, the property is
`undefined`.

### ServerSocket Objects ###

<code>ServerSocket.**bind**(*ip*, *port*)</code>

Binds the socket to the given *ip* and *port*.

<code>ServerSocket.**listen**()</code>

Configures the socket for listening.

<code>ServerSocket.**accept**()</code>

Blocks until a connection is made on the socket and returns a new
`ServerSocket` object representing the new connection.

<code>ServerSocket.**recv**(*size*)</code>

Receives up to *size* bytes of text from the connected client and
returns it as a string. If the connection has been closed,
`null` is returned instead.

<code>ServerSocket.**send**(*text*)</code>

Sends the given text to the connected client.

<code>ServerSocket.**close**()</code>

Closes the connection.

## Miscellaneous Functions ##

The source code for this functionality is in [tcb.cpp].

  [tcb.cpp]: packages/nsjetpack/components/src/tcb.cpp

<code>nsJetpack.**functionInfo**(*func*)</code>

Returns a JSON-able object with the following properties:

`filename` - The filename in which *func* is defined.

`lineNumber` - The line number at which *func* is defined.

<code>nsJetpack.**seal**(*object*, *isDeep*)</code>

This is essentially a JavaScript version of <code>[JS_SealObject]</code>.

  [JS_SealObject]: https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JS_SealObject

Note that according to the documentation for `JS_SealObject`
and [John Resig's post on Ecmascript 5], this actually appears to be
more similar to ES5's `Object.freeze()` than it is to ES5's
`Object.seal()`.

  [John Resig's post on Ecmascript 5]: http://ejohn.org/blog/ecmascript-5-objects-and-properties/
