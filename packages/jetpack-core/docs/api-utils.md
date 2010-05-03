The `api-utils` module provides some helpers useful to Jetpack's high-level API
implementations.

Introduction
------------

The Jetpack high-level API design guidelines make a number of recommendations.
This module implements some of those patterns so that your own implementations
don't need to reinvent them.

For example, public constructors should be callable both with and without the
`new` keyword.  Your module can implement this recommendation using the
`publicConstructor` function.

Options objects or "dictionaries" are also common throughout the high-level
APIs.  The guidelines recommend that public constructors should generally define
a single `options` parameter rather than defining many parameters.  Since one of
Jetpack's principles is to be friendly to developers, ideally all properties on
options dictionaries should be checked for correct type, and informative error
messages should be generated when clients make mistakes.  With the
`validateOptions` function, your module can easily do so.

Functions
---------

<code>apiUtils.**publicConstructor**(*privateConstructor*)</code>

Returns a function *C* that creates instances of *`privateConstructor`*.  *C*
may be called with or without the `new` keyword.

The prototype of each instance returned from *C* is *C*.`prototype`, and
*C*.`prototype` is an object whose prototype is
*`privateConstructor`*`.prototype`.  Instances returned from *C* are therefore
instances of both *C* and *`privateConstructor`*.

Instances returned from *C* are automatically memory tracked using
`memory.track` under the bin name *`privateConstructor`*`.name`.

*Example*

    function MyObject() {}
    exports.MyObject = apiUtils.publicConstructor(MyObject);

<code>apiUtils.**validateOptions**(*options*, *requirements*)</code>

Returns a validated options dictionary given some requirements.  If any of the
requirements are not met, an exception is thrown.

*`options`* is an object, the options dictionary to validate.  It's not modified.
If it's null or otherwise falsey, an empty object is assumed.

*`requirements`* is an object whose keys are the expected keys in *`options`*.
Any key in *`options`* that is not present in *`requirements`* is ignored.  Each
value in *`requirements`* is itself an object describing the requirements of its
key.  There are three optional keys in this object:

<table>
  <tr>
    <td><code>map</code></td>
    <td>
      A function that's passed the value of the key in
      <em><code>options</code></em>.  The return value of this function is used
      as the value of the key.  All exceptions thrown when calling the function
      are caught and discarded, and in that case the value of the key is its
      value in <em><code>options</code></em>.
    </td>
  </tr>
  <tr>
    <td><code>ok</code></td>
    <td>
      A function that's passed the value of the key in
      <em><code>options</code></em> or, if <code>map</code> is defined,
      <code>map</code>'s return value.  If it returns true, or if this function
      is undefined, the value is accepted.
    </td>
  </tr>
  <tr>
    <td><code>msg</code></td>
    <td>
      If <code>ok</code> returns false, an exception is thrown.  This string
      will be used as its message.  If undefined, a generic message is used.
    </td>
  </tr>
</table>

The return value is an object whose keys are those keys in *`requirements`* that
are also in *`options`* and whose values are the corresponding return values of
`map` or the corresponding values in *`options`*.  Note that any keys in
*`requirements`* that are not in *`options`* are not in the returned object.

*Examples*

A typical use:

    var options = { foo: 1337 };
    var validated = apiUtils.validateOptions(options, {
      foo: {
        map: function (val) val.toString(),
        ok: function (val) typeof(val) === "string",
        msg: "foo must be a string."
      }
    });
    // validated == { foo: "1337" }

If the key `foo` is optional and doesn't need to be mapped:

    var options = { foo: 1337 };
    var validated = apiUtils.validateOptions(options, { foo: {} });
    // validated == { foo: 1337 }

    options = {};
    validated = apiUtils.validateOptions(options, { foo: {} });
    // validated == {}
