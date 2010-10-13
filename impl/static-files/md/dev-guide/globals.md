By default, all Jetpack code is executed as [JavaScript 1.8.1] and has access
to all the globals defined by it, such as `Math`, `Array`, and `JSON`. Each
Jetpack module has its own set of these objects; this means that if, for
instance, the `String` prototype is changed in one module, the changes
will not be reflected in another module.

<span class="aside">
For an introduction to CommonJS modules, see the
[Packaging](#guide/packaging) tutorial.
</span>

Jetpack code also has access to the `require` and `exports` globals
as specified by version 1.0 of the [CommonJS Module Specification].

At the time of this writing, Jetpack code does *not* have access to
any globals defined by the [HTML5] specification, such as `window`,
`document`, or `localStorage`.

To access the infamous and powerful `Components` object, see the
[Chrome Authority](#guide/chrome) documentation.

## Unprivileged Globals ##

These globals are available regardless of the security context of the
Jetpack code.

<code>**\_\_url\_\_**</code>

The `__url__` global is a string identifying the URL from which
the Jetpack code has been retrieved.  If the code has no identifiable
URL, this value may be `null`.

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

<span class="aside">
For more information on packaging, see the [Package Specification] appendix.
</span>

<code>**packaging**</code>

The `packaging` global contains methods and metadata related to
the packages available in the current environment.

<code>packaging.**getURLForData**(*path*)</code>

Given a unix-style path relative to the calling package's `data`
directory, returns an absolute URL to the file or directory.

By "calling package", we mean the package in which the caller's source
code resides.

Thus, for example, if a package contains a resource at
`data/mydata.dat` and a module at `lib/foo.js`, the module at
`lib/foo.js` may make the following call to retrieve an absolute url
to `data/mydata.dat`:

    var mydata = packaging.getURLForData("/mydata.dat");

If the calling package has no `data` directory, an exception is
thrown.

<code>**memory**</code>

`memory` is an object that exposes functionality to track
objects of interest and help diagnose and prevent memory leaks.

<code>memory.**track**(*object*, [*bin*])</code>

Marks *object* for being tracked, and categorizes it with the given
bin name. If *bin* isn't specified, the memory tracker attempts to
infer a bin name by first checking the object's
`constructor.name`; if that fails or results in the generic
`Object`, the stack is inspected and the name of the current
function being executed&mdash;which is assumed to be a constructor
function&mdash;is used. If that fails, then the object is placed in a
bin named `generic`.

<code>memory.**getObjects**([*bin*])</code>

Returns an `Array` containing information about tracked objects
that have been categorized with the given bin name. If *bin* isn't
provided, information about all live tracked objects are returned.

Each element of the array is an object with the following keys:

<table>
  <tr>
    <td><code>weakref</code></td>
    <td>A weak reference to the object being tracked. Call
    <code>get()</code> on this object to retrieve its strong reference; if
    a strong reference to the object no longer exists, <code>get()</code>
    will return <code>null</code>.</td>
  </tr>
  <tr>
    <td><code>created</code></td>
    <td>A <code>Date</code> representing the date and time that
    <code>memory.track()</code> was called on the object being
    tracked.</td>
  </tr>
  <tr>
    <td><code>filename</code></td>
    <td>The name of the file that called <code>memory.track()</code> on
    the object being tracked.</td>
  </tr>
  <tr>
    <td><code>lineNo</code></td>
    <td>The line number of the file that called
    <code>memory.track()</code> on the object being tracked.</td>
  </tr>
</table>

<code>memory.**getBins**()</code>

Returns an `Array` containing the names of all bins that aren't
currently empty.

  [Components object]: https://developer.mozilla.org/en/Components_object
  [Security Roadmap]: #guide/security-roadmap
  [HTML5]: http://dev.w3.org/html5/spec/Overview.html
  [JavaScript 1.8.1]: https://developer.mozilla.org/En/New_in_JavaScript_1.8.1
  [CommonJS Module Specification]: http://wiki.commonjs.org/wiki/Modules/1.0
  [Package Specification]: #guide/package-spec
