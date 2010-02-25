The <tt>xhr</tt> module provides access to <tt>XMLHttpRequest</tt>
functionality, also known as AJAX.

## Exports ##

<tt>xhr.**XMLHttpRequest**()</tt>

Creates an <tt>XMLHttpRequest</tt>. This is a constructor, so its use
should always be preceded by the `new` operator. For more information,
see the MDC page on [Using XMLHttpRequest].

<tt>xhr.**getRequestCount**()</tt>

Returns the number of <tt>XMLHttpRequest</tt> objects that are alive
(i.e., currently active or about to be).

## Limitations ##

The `XMLHttpRequest` object is currently fairly limited, and does not
yet implement the `addEventListener()` or `removeEventListener()`
methods. It also doesn't yet implement the `upload` property.

Furthermore, the `XMLHttpRequest` object does not currently support
the `mozBackgroundRequest` property. All security UI, such as
username/password prompts, are automatically suppressed, so if
required authentication information isn't passed to the `open()`
method, the request will fail.

## Resource Use ##

Whenever this module is unloaded, all in-progress requests are immediately
aborted.

  [Using XMLHttpRequest]: https://developer.mozilla.org/En/Using_XMLHttpRequest
