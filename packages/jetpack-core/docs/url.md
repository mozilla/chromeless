The `url` module provides functionality for the parsing and
retrieving of URLs.

## Constructors ##

<code>url.**URL**(*source*, *base*)</code>

The URL constructor creates an object that represents a URL,
verifying that the provided string is a valid URL in the process.
Any API in the SDK which has a URL parameter will accept `URL` 
objects, not raw strings.

The `source` parameter is a string
to be converted into a URL. If `source` is not a valid URI, this
constructor will throw an exception.

The optional `base` parameter is an optional string that is used
to resolve the relative `source` URLs into absolute ones.

URL objects have the following properties:

* [scheme] {string} The name of the protocol in the URL.
* [userPass] {string} The username:password part of the URL; `null` if not present.
* [host] {string} The host of the URL, `null` if not present.
* [port] {int} The port number of the URL, `null` if none was specified.
* [path] {string} The path component of the URL.

## Functions ##

<code>url.**toFilename**(*url*)</code>
Attempts to convert the given URL to a native file path.  This
function will automatically attempt to resolve non-file protocols,
such as the `resource:` protocol, to their place on the file
system. An exception is raised if the URL can't be converted;
otherwise, the native file path is returned as a string.
The `url` parameter is the string URL to be converted.

<code>url.**fromFilename**(*path*)</code>
Converts the given native file path `path` to a `file:` URL.
