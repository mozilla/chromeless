By default, all Jetpack code is executed as [JavaScript 1.8.1] and has access
to all the globals defined by it, such as `Math`, `Array`, and `JSON`. Each
Jetpack module has its own set of these objects; this means that if, for
instance, the `String` prototype is changed in one module, the changes
will not be reflected in another module.

Jetpack code does *not*, by default, have access to any globals
defined by the [HTML5] specification, such as `window`, `document`, or
`localStorage`.

## Privileged Globals ##

The following globals are available if a Jetpack module is run with
chrome privileges. While all Jetpack modules are currently run with
chrome privileges by default, you shouldn't use them unless you
absolutely need to; see the [Security Roadmap] for more information.

<tt>**Components**</tt>

The infamous [Components object] that grants unfettered access to the
host system.

<tt>**Cc**</tt>

An alias for `Components.classes`.

<tt>**Ci**</tt>

An alias for `Components.interfaces`.

<tt>**Cu**</tt>

An alias for `Components.utils`.

<tt>**Cr**</tt>

An alias for `Components.results`.

## Unprivileged Globals ##

These globals are available regardless of the security context of the
Jetpack code.

<tt>**\_\_url\_\_**</tt>

The `__url__` global is a string identifying the URL from which
the Jetpack code has been retrieved.  If the code has no identifiable
URL, this value may be <tt>null</tt>.

<tt>**console**</tt>

<tt>console</tt> is an object with the following methods:

<tt>console.**log**(*object*[, *object*, ...])</tt>

Logs an informational message to the console. Depending on console's
underlying implementation and user interface, you may be able to
introspect into the properties of non-primitive objects that are
logged.

<tt>console.**info**(*object*[, *object*, ...])</tt>

A synonym for <tt>console.log()</tt>.

<tt>console.**warn**(*object*[, *object*, ...])</tt>

Logs a warning message to the console.

<tt>console.**error**(*object*[, *object*, ...])</tt>

Logs an error message to the console.

<tt>console.**debug**(*object*[, *object*, ...])</tt>

Logs a debug message to the console.

<tt>console.**exception**(*exception*)</tt>

Logs the given exception instance as an error, outputting information
about the exception's stack traceback if one is available.

<tt>console.**trace**()</tt>

Inserts a stack trace into the console at the point this function is called.

<tt>**memory**</tt>

<tt>memory</tt> is an object that exposes functionality to track
objects of interest and help diagnose and prevent memory leaks.

<tt>memory.**track**(*object*, [*bin*])</tt>

Marks *object* for being tracked, and categorizes it with the given
bin name. If *bin* isn't specified, the memory tracker attempts to
infer a bin name by first checking the object's
<tt>constructor.name</tt>; if that fails or results in the generic
<tt>Object</tt>, the stack is inspected and the name of the current
function being executed&mdash;which is assumed to be a constructor
function&mdash;is used. If that fails, then the object is placed in a
bin named <tt>generic</tt>.

<tt>memory.**getObjects**([*bin*])</tt>

Returns an <tt>Array</tt> containing information about tracked objects
that have been categorized with the given bin name. If *bin* isn't
provided, information about all live tracked objects are returned.

Each element of the array is an object with the following keys:

<table>
  <tr>
    <td><tt>weakref</tt></td>
    <td>A weak reference to the object being tracked. Call
    <tt>get()</tt> on this object to retrieve its strong reference; if
    a strong reference to the object no longer exists, <tt>get()</tt>
    will return <tt>null</tt>.</td>
  </tr>
  <tr>
    <td><tt>created</tt></td>
    <td>A <tt>Date</tt> representing the date and time that
    <tt>memory.track()</tt> was called on the object being
    tracked.</td>
  </tr>
  <tr>
    <td><tt>filename</tt></td>
    <td>The name of the file that called <tt>memory.track()</tt> on
    the object being tracked.</td>
  </tr>
  <tr>
    <td><tt>lineNo</tt></td>
    <td>The line number of the file that called
    <tt>memory.track()</tt> on the object being tracked.</td>
  </tr>
</table>

<tt>memory.**getBins**()</tt>

Returns an <tt>Array</tt> containing the names of all bins that aren't
currently empty.

  [Components object]: https://developer.mozilla.org/en/Components_object
  [Security Roadmap]: #guide/security-roadmap
  [HTML5]: http://dev.w3.org/html5/spec/Overview.html
  [JavaScript 1.8.1]: https://developer.mozilla.org/En/New_in_JavaScript_1.8.1
