The `url` module provides functionality for the parsing and
retrieving of URLs.

<api name="toFilename">
@method
Attempts to convert the given URL to a native file path.  This
function will automatically attempt to resolve non-file protocols,
such as the `resource:` protocol, to their place on the file
system. An exception is raised if the URL can't be converted;
otherwise, the native file path is returned as a string.
@param url {string} The URL to be converted.
</api>

<api name="fromFilename">
@method
Converts the given native file path to a `file:` URL.
@param path {string}
</api>

<api name="resolve">
@method
Returns an absolute URL given a base URL and a relative URL.
@param base {string}
@param relative {boolean}
</api>

<api name="parse">
@method
Parses the URL and returns an object with following keys:
@returns {object}
  @prop [scheme] {string} The name of the protocol in the URL.
  @prop [userPass] {string} The username:password part of the URL; `null` if
  not present.
  @prop [host] {string} The host of the URL, `null` if not present.
  @prop [port] {int} The port number of the URL, `null` if none was
  specified.
  @prop [path] {string} The path component of the URL.
@param url {string}
</api>
