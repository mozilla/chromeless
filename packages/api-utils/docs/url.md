<!-- contributed by Atul Varma [atul@mozilla.com]  -->
<!-- edited by Noelle Murata [fiveinchpixie@gmail.com]  -->


The `url` module provides functionality for the parsing and retrieving of URLs.

<api name="URL">
@class
<api name="URL">
@constructor
  The URL constructor creates an object that represents a URL,  verifying that
  the provided string is a valid URL in the process.  Any API in the SDK which
  has a URL parameter will accept `URL` objects, not raw strings, unless
  otherwise noted.

@param source {string}
  A string to be converted into a URL. If `source` is not a valid URI, this
  constructor will throw an exception.

@param [base] {string}
  An optional string used to resolve relative `source` URLs into absolute ones.
</api>

<api name="scheme">
@property {string}
  The name of the protocol in the URL.
</api>

<api name="userPass">
@property {string}
  The username:password part of the URL, `null` if not present.
</api>

<api name="host">
@property {string}
  The host of the URL, `null` if not present.
</api>

<api name="port">
@property {integer}
  The port number of the URL, `null` if none was specified.
</api>

<api name="path">
@property {string}
  The path component of the URL.
</api>

<api name="toString">
@method
  Returns a string representation of the URL.
@returns {string}
  The URL as a string.
</api>
</api>

<api name="toFilename">
@function
  Attempts to convert the given URL to a native file path.  This function will
  automatically attempt to resolve non-file protocols, such as the `resource:`
  protocol, to their place on the file system. An exception is raised if the URL
  can't be converted; otherwise, the native file path is returned as a string.

@param url {string}
  The URL, as a string, to be converted.

@returns {string}
  The converted native file path as a string.
</api>

<api name="fromFilename">
@function
  Converts the given native file path to a `file:` URL.

@param path {string}
  The native file path, as a string, to be converted.

@returns {string}
  The converted URL as a string.
</api>

