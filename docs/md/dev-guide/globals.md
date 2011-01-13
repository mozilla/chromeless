
## JavaScript Globals ##

By default, all code is executed as [JavaScript 1.8.1] and has access
to all the globals defined by it, such as `Math`, `Array`, and `JSON`. Each
module has its own set of these objects; this means that if, for
instance, the `String` prototype is changed in one module, the changes
will not be reflected in another module.

<span class="aside">
For an introduction to CommonJS modules, see the
[Packaging](#guide/packaging) tutorial.
</span>

## CommonJS Globals ##

Code also has access to the `require` and `exports` globals
as specified by version 1.0 of the [CommonJS Module Specification].

## HTML5 Globals ##

At the time of this writing, code does *not* have access to
any globals defined by the [HTML5] specification, such as `window`,
`document`, or `localStorage`.

## SDK Globals ##

These globals are available regardless of the security context of the code.

<code>**console**</code>

`console` is an object with the following methods:

<code>console.**log**(*object*[, *object*, ...])</code>

Logs an informational message to the console. Depending on console's
underlying implementation and user interface, you may be able to
introspect into the properties of non-primitive objects that are
logged.

<code>console.**info**(*object*[, *object*, ...])</code>

A synonym for `console.log()`.

<code>console.**warn**(*object*[, *object*, ...])</code>

Logs a warning message to the console.

<code>console.**error**(*object*[, *object*, ...])</code>

Logs an error message to the console.

<code>console.**debug**(*object*[, *object*, ...])</code>

Logs a debug message to the console.

<code>console.**exception**(*exception*)</code>

Logs the given exception instance as an error, outputting information
about the exception's stack traceback if one is available.

<code>console.**trace**()</code>

Inserts a stack trace into the console at the point this function is called.

  [Components object]: https://developer.mozilla.org/en/Components_object
  [Security Roadmap]: #guide/security-roadmap
  [HTML5]: http://dev.w3.org/html5/spec/Overview.html
  [JavaScript 1.8.1]: https://developer.mozilla.org/En/New_in_JavaScript_1.8.1
  [CommonJS Module Specification]: http://wiki.commonjs.org/wiki/Modules/1.0
  [Package Specification]: #guide/package-spec
